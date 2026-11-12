# Sentinel API foundation

All routes use JSON. Website, monitoring, and SEO routes require an authenticated session. Verification tokens are not returned by registration.

## Identity

- `POST /api/auth/register/` accepts `name`, `email`, and `password`; it returns a generic `202` response and is limited to 5 requests/hour/IP.
- `POST /api/auth/verify-email/` accepts `email` and `token`; tokens expire after one hour and are single-use.
- `GET /api/auth/csrf/` issues a CSRF cookie and returns a request token.
- `POST /api/auth/login/` creates a session for a verified user; limited to 5 attempts/hour/IP.
- `POST /api/auth/logout/` ends the session and requires CSRF.
- `GET /api/auth/me/` returns the signed-in user's id, name, and email.

## Websites

All routes below are scoped to the signed-in user.

- `GET /api/websites/` lists owned websites.
- `POST /api/websites/` accepts a hostname-only domain and optional display name; 30 creates/hour/user.
- `GET /api/websites/{id}/`, `PATCH /api/websites/{id}/`, and `DELETE /api/websites/{id}/` read, edit the display name, and remove an owned site.
- `POST /api/websites/{id}/verify/` checks the exact TXT value at `_sentinel-verification.{domain}`; 20 attempts/hour/user.

## Uptime monitoring

- `POST /api/monitoring/websites/{website_id}/check/` checks an owned, verified website and stores its HTTPS result; 20 requests/hour/user.
- `GET /api/monitoring/checks/?limit=20` returns recent check results owned by the current user. Limit is clamped to 1-100.
- `python manage.py run_monitoring` checks verified sites every five minutes locally; options include `--once`, `--interval-seconds`, and `--limit`.

The outbound client validates public IPv4/IPv6 answers, connects to a validated address directly to avoid a second DNS resolution, does not follow redirects, and applies strict DNS/connect/read timeouts and a 1 KB body cap for uptime checks. It stores no response bodies or raw exception text. HTTP 5xx and connection/DNS/TLS errors are down; other HTTP status codes are considered reachable.

## SEO foundations

All SEO routes require an authenticated session and only operate on owned, verified websites.

- `POST /api/seo/websites/{website_id}/audit/` fetches the verified homepage, `/robots.txt`, and `/sitemap.xml` over pinned HTTPS; limited to 5 requests/hour/user. Each endpoint is allowlisted, bounded by a response cap and timeout, and redirects are not followed.
- `GET /api/seo/audits/` returns up to 100 recent audits for websites owned by the current user.

The audit checks title and description quality, headings, language, viewport, canonical, noindex, image alt attributes, Open Graph and Twitter card metadata, JSON-LD presence, favicon, robots.txt crawl directives, and sitemap XML presence. HTML is limited to a 64 KB prefix; robots and sitemap responses are each limited to 16 KB. It stores a heuristic 0-100 score and static issue codes/messages. It strips canonical query strings/fragments and does not alter pages or make ranking/traffic claims. It does not inspect search engine rankings, a full backlink index, arbitrary sitemap URLs, or site-wide pages.

- `POST /api/seo/websites/{website_id}/backlinks/` checks one to three caller-provided candidate domains against the verified site's domain; limited to 5 requests/hour/user.

The backlink candidate check fetches only each candidate's HTTPS homepage, follows no redirects, pins each request to a validated public IP, and limits HTML reads to 64 KB. It returns whether a homepage link was found, not a complete backlink profile. Results are not stored and do not claim that a candidate is a guaranteed outreach opportunity.

## Security header checks

All security audit routes require an authenticated session and operate only on websites owned by the current user that have verified ownership.

- `POST /api/security/websites/{website_id}/audit/` fetches the verified host over HTTPS and saves six common response-header checks with remediation suggestions; limited to 5 requests/hour/user.
- `POST /api/security/websites/{website_id}/domain-audit/` checks public SPF, DMARC, CAA, and HTTPS certificate signals for the verified host; limited to the same rate. DNS values are not stored, and no exploit or intrusive scan runs.
- `GET /api/security/audits/` returns up to 100 recent security audits for websites owned by the current user.

The header audit checks HSTS, Content-Security-Policy, X-Content-Type-Options, frame protection, Referrer-Policy, and Permissions-Policy. It follows no redirects, pins requests to a validated public address, and stores only normalized findings without raw header values or response bodies. Domain checks store status and fixed remediation guidance, not raw DNS records. These configuration reviews are not penetration tests or security certification.

## Email marketing

All audience and campaign routes require an authenticated workspace owner, except the token-based confirmation and unsubscribe routes.

- `GET /api/email-marketing/contacts/` returns up to 500 contacts owned by the current user.
- `POST /api/email-marketing/contacts/` creates one pending contact after the owner confirms opt-in; sends a double-opt-in confirmation when SMTP is configured.
- `POST /api/email-marketing/contacts/import/` accepts up to 100 opted-in email addresses per batch; confirmations are sent individually.
- `POST /api/email-marketing/contacts/{contact_id}/resend-confirmation/` resends a pending contact confirmation.
- `POST /api/email-marketing/confirm/` activates a pending contact using a one-time, expiring email token.
- `GET /api/email-marketing/campaigns/` lists up to 50 recent campaigns owned by the current user.
- `POST /api/email-marketing/campaigns/send/` sends a branded HTML campaign with a plain-text alternative to at most 100 confirmed, subscribed contacts. Optional `brand_name` and `accent_palette` values customize the email template.
- `POST /api/email-marketing/unsubscribe/` suppresses an address using its per-contact unsubscribe token.

### Email lookup

- `POST /api/email-lookup/check/` (authenticated, rate-limited) validates a complete email address and checks public DNS MX records, with the RFC implicit-MX fallback. It does not send email or persist the address. A positive DNS result means the domain publishes mail routing; the specific mailbox remains unknown.
- `POST /api/email-lookup/send-confirmation/` (authenticated, rate-limited) sends a time-limited confirmation link to a complete address when SMTP is configured. It does not add the address to a marketing audience.
- `POST /api/email-lookup/confirm/` accepts the signed 24-hour token and confirms that someone could open the link from that inbox at the time of confirmation. The result does not prove identity or future deliverability.
- Lookup checks and confirmation are restricted to complete addresses supplied by the authenticated user. Sentinel does not infer masked addresses or probe SMTP recipient mailboxes.
- `POST /api/email-lookup/share-requests/` creates an authenticated, seven-day recipient-submitted address request and returns its share URL; each owner may keep up to 20 active requests.
- `GET /api/email-lookup/share-requests/` returns the current user's recent requests. Email addresses are returned only after recipient confirmation.
- `POST /api/email-lookup/share-requests/submit/` lets the recipient submit their own complete address from the share link and sends a separate confirmation email; the address is not added to a marketing list.
- `POST /api/email-lookup/share-requests/confirm/` consumes a 24-hour confirmation token and makes that address visible only to the request owner. Public request submission and confirmation are IP rate-limited.

Contacts are never discovered by crawling websites. Gmail and other providers are accepted only through explicit opt-in/manual or attested import, and a contact must confirm their address before campaigns can reach them. Unsubscribed addresses cannot be re-added by an administrator. Campaigns include unsubscribe instructions and list-unsubscribe headers; sends are limited to two per hour/user.

## Operations

- `GET /api/health/` returns `200` if MongoDB can be pinged or a generic `503` otherwise.
