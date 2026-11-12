# Sentinel database schema

Django models use MongoDB's official Django backend and ObjectId primary keys. Review and apply migrations with `python manage.py migrate` against the intended database.

## Identity

### User (`accounts_user`)

- ObjectId primary key, unique normalized `email`, `name`, Django password hash
- `is_active` remains false until email verification
- Django permission relations and standard account timestamps

### EmailVerification (`accounts_emailverification`)

- ObjectId primary key and user reference
- Unique SHA-256 `token_hash`; raw token is emailed and never persisted
- Creation, one-hour expiry, and consumption timestamps

## Websites

### Website (`websites_website`)

- ObjectId primary key and owner reference
- `display_name`, normalized hostname-only `domain`, verification status and pending TXT token
- `verified_at`, `last_uptime_check_at`, creation/update timestamps
- Unique owner/domain constraint and owner/creation-time index

Ownership is verified by an exact TXT record at `_sentinel-verification.{domain}`.

## Monitoring

### UptimeCheck (`monitoring_uptimecheck`)

- ObjectId primary key, website reference, optional initiating user
- `status` (`up`/`down`), optional HTTP status, response duration, safe finite error category, timestamp
- Website/time index for history reads

No response body, cookies, or raw exception text are stored.

## SEO

### SEOAudit (`seo_seoaudit`)

- ObjectId primary key, website reference, optional initiating user
- Audit status, HTTP status, heuristic score, title/description/H1/canonical fields
- Viewport/indexability flags; language/headings/image-alt, social metadata, structured-data and favicon signals; robots/sitemap flags; structured static issues, safe error category, timestamp
- Website/time index

## Security

### SecurityAudit (`security_securityaudit`)

- ObjectId primary key, website reference, optional initiating user
- Audit type (web headers or domain/TLS), HTTP status when applicable, normalized findings with fixed remediation guidance, heuristic score, safe error category, timestamp
- Website/time index

## Email marketing

### MarketingContact (`email_marketing_marketingcontact`)

- ObjectId primary key, owning user, normalized email and optional name
- Consent source/timestamp, pending/subscribed/unsubscribed state, confirmation hash/expiry, confirmation and unsubscribe timestamps/token
- Unique owner/email constraint and owner/status/time index

### EmailCampaign (`email_marketing_emailcampaign`)

- ObjectId primary key, owning user, subject and plain-text body
- Send status and attempted/sent/failed counts with timestamps

Canonical query strings and fragments are removed before storage. Only a bounded HTML prefix is processed.

Django admin, auth, and content-type apps use MongoDB-specific migrations under `backend/mongo_migrations/`. Feature migrations live in each app's `migrations/` directory.
