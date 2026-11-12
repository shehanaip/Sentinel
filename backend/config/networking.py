import http.client
import ipaddress
import socket
import ssl
import time

import dns.exception
import dns.resolver

DNS_TIMEOUT_SECONDS = 3
CONNECT_TIMEOUT_SECONDS = 4
MAX_DNS_ADDRESSES = 4
USER_AGENT = "Sentinel-Monitor/1.0"


class UnsafeTarget(Exception):
    pass


class DNSLookupError(Exception):
    pass


class PinnedHTTPSConnection(http.client.HTTPSConnection):
    def __init__(self, hostname, address, timeout):
        super().__init__(hostname, port=443, timeout=timeout, context=ssl.create_default_context())
        self.address = address

    def connect(self):
        raw_socket = socket.create_connection((self.address, self.port), self.timeout)
        try:
            self.sock = self._context.wrap_socket(raw_socket, server_hostname=self.host)
        except Exception:
            raw_socket.close()
            raise


def resolve_public_addresses(hostname):
    resolver = dns.resolver.Resolver(configure=True)
    resolver.lifetime = DNS_TIMEOUT_SECONDS
    resolver.timeout = min(0.75, DNS_TIMEOUT_SECONDS / max(len(resolver.nameservers), 1))
    addresses = set()
    found_answer = False
    for record_type in ("A", "AAAA"):
        try:
            answers = resolver.resolve(hostname, record_type, lifetime=DNS_TIMEOUT_SECONDS)
        except (dns.resolver.NoAnswer, dns.resolver.NXDOMAIN):
            continue
        except dns.exception.Timeout as exc:
            raise TimeoutError from exc
        except dns.exception.DNSException as exc:
            raise DNSLookupError from exc
        found_answer = True
        for answer in answers:
            address = ipaddress.ip_address(answer.address)
            if not address.is_global:
                raise UnsafeTarget
            addresses.add(str(address))
    if not addresses:
        if found_answer:
            raise UnsafeTarget
        raise socket.gaierror("No public address found")
    if len(addresses) > MAX_DNS_ADDRESSES:
        raise UnsafeTarget
    return sorted(addresses)


def safe_https_get(hostname, *, path="/", max_body_bytes=1024, timeout_seconds=4, resolved_addresses=None):
    """Fetch a small allowlisted HTTPS resource through validated public IPs, without redirects."""
    if path not in {"/", "/robots.txt", "/sitemap.xml"}:
        raise UnsafeTarget
    addresses = resolved_addresses if resolved_addresses is not None else resolve_public_addresses(hostname)
    if not addresses or len(addresses) > MAX_DNS_ADDRESSES:
        raise UnsafeTarget
    for address in addresses:
        if not ipaddress.ip_address(address).is_global:
            raise UnsafeTarget
    last_error = None
    for address in addresses:
        connection = PinnedHTTPSConnection(hostname, address, timeout_seconds)
        started = time.perf_counter()
        response = None
        try:
            connection.request("GET", path, headers={"User-Agent": USER_AGENT, "Accept": "*/*", "Connection": "close"})
            response = connection.getresponse()
            deadline = time.monotonic() + timeout_seconds
            body = bytearray()
            response_socket = connection.sock
            if response_socket is None and response.fp is not None:
                response_socket = getattr(getattr(response.fp, "raw", None), "_sock", None)
            if response_socket is None:
                raise ConnectionError
            while max_body_bytes > 0 and len(body) <= max_body_bytes:
                remaining = deadline - time.monotonic()
                if remaining <= 0:
                    raise TimeoutError
                response_socket.settimeout(remaining)
                chunk = response.read1(min(4096, max_body_bytes + 1 - len(body)))
                if not chunk:
                    break
                body.extend(chunk)
            elapsed_ms = max(0, round((time.perf_counter() - started) * 1000))
            return {
                "status_code": response.status,
                "duration_ms": elapsed_ms,
                "content_type": response.getheader("Content-Type", ""),
                "security_headers": {
                    name.lower(): (response.getheader(name, "") or "")[:2048]
                    for name in (
                        "Strict-Transport-Security", "Content-Security-Policy",
                        "X-Content-Type-Options", "X-Frame-Options",
                        "Referrer-Policy", "Permissions-Policy",
                    )
                },
                "body": bytes(body[:max_body_bytes]),
                "body_truncated": len(body) > max_body_bytes,
            }
        except (socket.timeout, TimeoutError):
            last_error = TimeoutError
        except ssl.SSLError:
            last_error = ssl.SSLError
        except (OSError, http.client.HTTPException):
            last_error = ConnectionError
        finally:
            if response is not None:
                response.close()
            connection.close()
    if last_error is TimeoutError:
        raise TimeoutError
    if last_error is ssl.SSLError:
        raise ssl.SSLError
    raise ConnectionError
