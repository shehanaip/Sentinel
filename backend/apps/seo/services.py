from html.parser import HTMLParser
import ipaddress
import http.client
import re
import socket
import ssl
from urllib.parse import urljoin, urlsplit, urlunsplit

import dns.exception
from django.utils import timezone

from apps.websites.models import Website
from config.networking import DNSLookupError, UnsafeTarget, resolve_public_addresses, safe_https_get
from .models import SEOAudit

MAX_HTML_BYTES = 64 * 1024


class PageMetadataParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.title = ""
        self.description = ""
        self.h1 = ""
        self.canonical = ""
        self.has_viewport = False
        self.indexable = True
        self.language = ""
        self.h1_count = 0
        self.h2_count = 0
        self.image_count = 0
        self.images_missing_alt = 0
        self.open_graph_title = ""
        self.open_graph_description = ""
        self.open_graph_image = ""
        self.twitter_card = ""
        self.structured_data_count = 0
        self.has_favicon = False
        self._inside_title = False
        self._inside_h1 = False
        self._inside_h2 = False

    def handle_starttag(self, tag, attrs):
        attrs = {key.lower(): value or "" for key, value in attrs}
        tag = tag.lower()
        if tag == "html":
            self.language = attrs.get("lang", "")[:32].strip()
        elif tag == "title":
            self._inside_title = True
        elif tag == "h1":
            self.h1_count += 1
            if not self.h1:
                self._inside_h1 = True
        elif tag == "h2":
            self.h2_count += 1
            self._inside_h2 = True
        elif tag == "img":
            self.image_count += 1
            if "alt" not in attrs:
                self.images_missing_alt += 1
        elif tag == "script" and attrs.get("type", "").lower().split(";")[0].strip() == "application/ld+json":
            self.structured_data_count += 1
        elif tag == "link" and "icon" in attrs.get("rel", "").lower().split():
            self.has_favicon = True
        elif tag == "meta":
            prop = attrs.get("property", "").strip().lower()
            name = attrs.get("name", "").strip().lower()
            content = attrs.get("content", "").strip()
            if prop == "og:title": self.open_graph_title = content[:300]
            elif prop == "og:description": self.open_graph_description = content[:320]
            elif prop == "og:image": self.open_graph_image = content[:512]
            elif name == "twitter:card": self.twitter_card = content[:32]
            if name == "description":
                self.description = attrs.get("content", "")[:320].strip()
            elif name == "viewport":
                self.has_viewport = bool(attrs.get("content"))
            elif name in {"robots", "googlebot"} and "noindex" in attrs.get("content", "").lower():
                self.indexable = False
        elif tag == "link" and "canonical" in attrs.get("rel", "").lower().split() and not self.canonical:
            self.canonical = attrs.get("href", "")[:512].strip()

    def handle_endtag(self, tag):
        if tag.lower() == "title":
            self._inside_title = False
        elif tag.lower() == "h1":
            self._inside_h1 = False
        elif tag.lower() == "h2":
            self._inside_h2 = False

    def handle_data(self, data):
        if self._inside_title:
            self.title = (self.title + data)[:300]
        if self._inside_h1:
            self.h1 = (self.h1 + data)[:300]
        if self._inside_h2 and data.strip():
            self._inside_h2 = False

    def finish(self):
        self.title = " ".join(self.title.split())
        self.h1 = " ".join(self.h1.split())


def _audit_metadata(parser, body_truncated, robots_txt_found=False, sitemap_found=False, blocks_all_crawlers=False):
    issues = []
    score = 100
    def issue(code, message, points, severity="warning"):
        nonlocal score
        issues.append({"code": code, "severity": severity, "message": message})
        score -= points

    title_length = len(parser.title)
    if not parser.title:
        issue("missing_title", "Add a descriptive page title.", 20, "high")
    elif not 30 <= title_length <= 60:
        issue("title_length", "Aim for a title between 30 and 60 characters.", 8)
    if not parser.description:
        issue("missing_description", "Add a meta description for search result summaries.", 18, "high")
    elif not 70 <= len(parser.description) <= 160:
        issue("description_length", "Aim for a meta description between 70 and 160 characters.", 6)
    if not parser.h1:
        issue("missing_h1", "Add one clear main heading to the page.", 12)
    if not parser.has_viewport:
        issue("missing_viewport", "Add a viewport meta tag for mobile layouts.", 10)
    if not parser.canonical:
        issue("missing_canonical", "Add a canonical URL to identify the preferred page address.", 6)
    if not parser.indexable:
        issue("noindex", "The page has a noindex directive, so search engines are asked not to index it.", 25, "high")
    if not parser.language:
        issue("missing_language", "Set the document language on the html element for assistive technology and language targeting.", 4)
    if parser.h1_count > 1:
        issue("multiple_h1", "Use one primary H1 heading to make the page topic clear.", 5)
    if parser.images_missing_alt:
        issue("image_alt", f"Add useful alt text to {parser.images_missing_alt} of {parser.image_count} images.", min(10, 3 + parser.images_missing_alt))
    if not parser.open_graph_title or not parser.open_graph_description or not parser.open_graph_image:
        issue("incomplete_social_preview", "Complete Open Graph title, description, and image for richer link previews.", 3)
    if not parser.twitter_card:
        issue("missing_twitter_card", "Add a Twitter/X card type so shared links have a defined preview.", 2)
    if not parser.structured_data_count:
        issue("no_structured_data", "No JSON-LD structured data was detected; add relevant schema only when it accurately describes the page.", 2, "info")
    if not parser.has_favicon:
        issue("missing_favicon", "Add a favicon link so browser tabs and bookmarks use your site identity.", 1, "info")
    if not robots_txt_found:
        issue("missing_robots_txt", "No readable robots.txt was found at the site root.", 3, "info")
    if not sitemap_found:
        issue("missing_sitemap", "No XML sitemap was found at /sitemap.xml.", 4)
    if blocks_all_crawlers:
        issue("robots_blocks_all", "robots.txt disallows crawling the entire site for all crawlers.", 20, "high")
    if body_truncated:
        issue("page_truncated", "Only the first 64 KB of HTML was inspected; later metadata may not be included.", 0, "info")
    return max(0, min(100, score)), issues


def _safe_canonical(value):
    if not value:
        return ""
    try:
        parsed = urlsplit(value.strip())
        if parsed.scheme and parsed.scheme.lower() not in {"http", "https"}:
            return ""
        if parsed.username or parsed.password:
            host = parsed.hostname or ""
            netloc = f"{host}:{parsed.port}" if parsed.port else host
        else:
            netloc = parsed.netloc
        return urlunsplit((parsed.scheme.lower(), netloc, parsed.path, "", ""))[:512]
    except ValueError:
        return ""


class BacklinkPageParser(HTMLParser):
    def __init__(self, website_domain):
        super().__init__(convert_charrefs=True)
        self.website_domain = website_domain.lower().removeprefix("www.")
        self.links_found = 0
        self.nofollow_links = 0

    def handle_starttag(self, tag, attrs):
        if tag.lower() != "a":
            return
        attrs = {key.lower(): value or "" for key, value in attrs}
        href = attrs.get("href", "").strip()
        if not href:
            return
        try:
            parsed = urlsplit(urljoin("https://candidate.invalid/", href))
            host = (parsed.hostname or "").lower().removeprefix("www.")
        except ValueError:
            return
        if parsed.scheme.lower() not in {"https", "http"} or not (host == self.website_domain or host.endswith("." + self.website_domain)):
            return
        self.links_found += 1
        if "nofollow" in attrs.get("rel", "").lower().split():
            self.nofollow_links += 1


def _candidate_hostname(value):
    if not isinstance(value, str):
        return ""
    raw = value.strip()
    if not raw or len(raw) > 300:
        return ""
    try:
        parsed = urlsplit(raw if "://" in raw else "//" + raw)
        if parsed.scheme and parsed.scheme.lower() != "https":
            return ""
        if parsed.username or parsed.password or parsed.port or parsed.path not in {"", "/"} or parsed.query or parsed.fragment:
            return ""
        host = (parsed.hostname or "").rstrip(".").lower().encode("idna").decode("ascii")
    except (ValueError, UnicodeError):
        return ""
    try:
        ipaddress.ip_address(host)
        return ""
    except ValueError:
        pass
    if not re.fullmatch(r"(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}", host):
        return ""
    if host in {"localhost", "local"} or host.endswith((".localhost", ".local", ".internal")):
        return ""
    return host


def check_backlink_candidates(website, candidates):
    """Check up to three caller-provided HTTPS homepages for links to a verified site."""
    if website.verification_status != Website.VerificationStatus.VERIFIED:
        raise ValueError("Verify website ownership before checking backlink candidates.")
    if not isinstance(candidates, list) or not 1 <= len(candidates) <= 3:
        raise ValueError("Enter between one and three candidate domains.")
    results = []
    own_domain = website.domain.lower().removeprefix("www.")
    for candidate in candidates:
        hostname = _candidate_hostname(candidate)
        if not hostname:
            results.append({"domain": str(candidate)[:253], "status": "invalid_domain", "links_found": 0, "nofollow_links": 0, "truncated": False})
            continue
        if hostname == own_domain or hostname.endswith("." + own_domain):
            results.append({"domain": hostname, "status": "same_site", "links_found": 0, "nofollow_links": 0, "truncated": False})
            continue
        try:
            addresses = resolve_public_addresses(hostname)
            response = safe_https_get(hostname, max_body_bytes=MAX_HTML_BYTES, timeout_seconds=5, resolved_addresses=addresses)
            if not (200 <= response["status_code"] < 300) or "text/html" not in response["content_type"].lower():
                raise LookupError
            parser = BacklinkPageParser(website.domain)
            parser.feed(response["body"].decode("utf-8", errors="replace"))
            results.append({"domain": hostname, "status": "link_found" if parser.links_found else "no_homepage_link", "links_found": parser.links_found, "nofollow_links": parser.nofollow_links, "truncated": response["body_truncated"]})
        except LookupError:
            results.append({"domain": hostname, "status": "unavailable", "links_found": 0, "nofollow_links": 0, "truncated": False})
        except (UnsafeTarget, dns.exception.DNSException, DNSLookupError, socket.gaierror, socket.timeout, TimeoutError, ssl.SSLError, OSError, http.client.HTTPException, ConnectionError):
            results.append({"domain": hostname, "status": "unavailable", "links_found": 0, "nofollow_links": 0, "truncated": False})
    return results


def run_seo_audit(website, *, created_by=None):
    if website.verification_status != Website.VerificationStatus.VERIFIED:
        raise ValueError("Verify website ownership before running an SEO audit.")
    error_category = ""
    http_status = None
    robots_txt_found = sitemap_found = blocks_all_crawlers = False
    addresses = None
    try:
        addresses = resolve_public_addresses(website.domain)
        response = safe_https_get(website.domain, max_body_bytes=MAX_HTML_BYTES, timeout_seconds=5, resolved_addresses=addresses)
        http_status = response["status_code"]
        if "text/html" not in response["content_type"].lower():
            raise LookupError("not_html")
        parser = PageMetadataParser()
        parser.feed(response["body"].decode("utf-8", errors="replace"))
        parser.finish()
        parser.canonical = _safe_canonical(parser.canonical)
        try:
            robots = safe_https_get(website.domain, path="/robots.txt", max_body_bytes=16 * 1024, timeout_seconds=3, resolved_addresses=addresses)
            robots_txt_found = 200 <= robots["status_code"] < 300
            if robots_txt_found:
                active_for_all = False
                for line in robots["body"].decode("utf-8", errors="replace").splitlines():
                    key, _, value = line.partition(":")
                    if key.strip().lower() == "user-agent":
                        active_for_all = value.strip() == "*"
                    elif active_for_all and key.strip().lower() == "disallow" and value.strip() == "/":
                        blocks_all_crawlers = True
        except (OSError, http.client.HTTPException, TimeoutError, ssl.SSLError):
            pass
        try:
            sitemap = safe_https_get(website.domain, path="/sitemap.xml", max_body_bytes=16 * 1024, timeout_seconds=3, resolved_addresses=addresses)
            sample = sitemap["body"].decode("utf-8", errors="replace").lower()
            sitemap_found = 200 <= sitemap["status_code"] < 300 and ("<urlset" in sample or "<sitemapindex" in sample)
        except (OSError, http.client.HTTPException, TimeoutError, ssl.SSLError):
            pass
        score, issues = _audit_metadata(parser, response["body_truncated"], robots_txt_found, sitemap_found, blocks_all_crawlers)
        status = SEOAudit.Status.COMPLETE
    except LookupError:
        parser = PageMetadataParser()
        score, issues = 0, []
        status, error_category = SEOAudit.Status.ERROR, SEOAudit.ErrorCategory.NOT_HTML
    except UnsafeTarget:
        parser = PageMetadataParser()
        score, issues = 0, []
        status, error_category = SEOAudit.Status.ERROR, SEOAudit.ErrorCategory.BLOCKED_ADDRESS
    except (dns.exception.DNSException, DNSLookupError, socket.gaierror):
        parser = PageMetadataParser()
        score, issues = 0, []
        status, error_category = SEOAudit.Status.ERROR, SEOAudit.ErrorCategory.DNS_ERROR
    except (socket.timeout, TimeoutError):
        parser = PageMetadataParser()
        score, issues = 0, []
        status, error_category = SEOAudit.Status.ERROR, SEOAudit.ErrorCategory.TIMEOUT
    except ssl.SSLError:
        parser = PageMetadataParser()
        score, issues = 0, []
        status, error_category = SEOAudit.Status.ERROR, SEOAudit.ErrorCategory.TLS_ERROR
    except (OSError, http.client.HTTPException, ConnectionError):
        parser = PageMetadataParser()
        score, issues = 0, []
        status, error_category = SEOAudit.Status.ERROR, SEOAudit.ErrorCategory.CONNECTION_ERROR

    audit = SEOAudit.objects.create(
        website=website,
        created_by=created_by,
        status=status,
        http_status=http_status,
        score=score,
        title=parser.title,
        description=parser.description,
        h1=parser.h1,
        canonical_url=parser.canonical,
        has_viewport=parser.has_viewport,
        is_indexable=parser.indexable,
        language=parser.language,
        h1_count=parser.h1_count,
        h2_count=parser.h2_count,
        image_count=parser.image_count,
        images_missing_alt=parser.images_missing_alt,
        open_graph_title=parser.open_graph_title,
        open_graph_description=parser.open_graph_description,
        open_graph_image=parser.open_graph_image,
        twitter_card=parser.twitter_card,
        structured_data_count=parser.structured_data_count,
        has_favicon=parser.has_favicon,
        robots_txt_found=robots_txt_found,
        sitemap_found=sitemap_found,
        blocks_all_crawlers=blocks_all_crawlers,
        issues=issues,
        error_category=error_category,
        checked_at=timezone.now(),
    )
    return audit
