# Sentinel --- Security Monitoring as a Service

> **Project status:** Selected / locked\
> **Document purpose:** Product specification and implementation guide
> for AI-assisted ("vibe coding") development.\
> **Technology policy:** Technology-agnostic. The implementation stack
> may change, but the architecture, security rules, product behavior,
> and quality requirements in this document should remain consistent.

------------------------------------------------------------------------

## 1. Product Vision

Sentinel is a public, subscription-based SaaS platform that helps
developers, freelancers, agencies, and businesses monitor websites they
own or are explicitly authorized to manage.

Sentinel checks website availability and selected security
configuration, keeps a history of results, and sends alerts when a
meaningful change or problem is detected.

Sentinel is a **monitoring and configuration-checking platform**, not a
guarantee that a website is secure and not a replacement for a
professional penetration test.

### Main value proposition

> Monitor your websites' availability and selected security signals from
> one dashboard, with clear explanations and timely alerts.

### Target users

-   Freelancers managing client websites
-   Web development agencies
-   Small businesses and online stores
-   Developers and small SaaS teams
-   Website owners who want basic uptime and configuration monitoring

### Product principles

1.  **Security first:** Treat user data, credentials, domains, and
    monitoring infrastructure as sensitive.
2.  **Technology independent:** Any suitable language, framework,
    database, or frontend may be used if the required behavior and
    architecture are preserved.
3.  **Modular architecture:** Each feature should have clear ownership
    and boundaries.
4.  **Consistent structure:** Use explicit route, controller/handler,
    service, model/entity, repository/data-access, validation, and test
    layers where applicable.
5.  **Small increments:** Build, test, and document one vertical feature
    at a time.
6.  **Accessible by default:** Responsive UI, keyboard support, semantic
    controls, clear errors, and sufficient contrast.
7.  **No fake functionality:** Do not present mock data as live
    monitoring or claim an integration works until it has been tested.
8.  **Secure defaults:** Never expose secrets, raw stack traces,
    internal infrastructure details, or another tenant's data.

------------------------------------------------------------------------

## 2. MVP Scope

Build the smallest genuinely useful SaaS before adding advanced scanning
or a mobile app.

### Required for MVP

-   Public landing page
-   Registration, login, logout, email verification, and password reset
-   User dashboard
-   Add, verify, view, edit, pause, and remove monitored websites
-   Website uptime checks
-   HTTPS/TLS certificate expiry checks
-   Basic security-header checks
-   Basic DNS record snapshot/checks, with limitations clearly explained
-   Check history and finding details
-   Email notifications for confirmed incidents and recovery
-   Free and Pro plan support
-   Subscription status and usage limits
-   Billing provider integration behind a replaceable adapter
-   Admin area for support and platform operations
-   Audit logs for security-sensitive actions
-   Automated tests, migrations, seed/demo data, setup instructions, and
    deployment documentation

### Not required in the first release

-   Automated vulnerability exploitation
-   Intrusive or broad port scanning
-   Automatic website remediation
-   Full penetration testing
-   AI security analysis
-   Native mobile apps
-   Complex enterprise SSO
-   Team/agency accounts
-   Multiple payment providers at once
-   Public user-to-user features

Keep the architecture extensible for later additions, but do not build
these features prematurely.

------------------------------------------------------------------------

## 3. Proposed Plans

These are initial product defaults and must be configurable, not
hard-coded throughout the codebase.

  -----------------------------------------------------------------------
  Feature                                  Free                       Pro
  ------------------- ------------------------- -------------------------
  Monitored websites                          1                        10

  Minimum scheduled                   5 minutes      1 minute, subject to
  check interval                                                 capacity

  Uptime checks                             Yes                       Yes

  TLS certificate                           Yes                       Yes
  expiry                                        

  Security-header                         Basic                     Basic
  checks                                        

  DNS snapshot/checks                     Basic                     Basic

  Check history                          7 days                   90 days

  Email alerts           Yes, reasonable limits                       Yes

  Custom alert rules                         No                       Yes

  Price                                ৳0/month           Initial target:
                                                               ৳499/month
  -----------------------------------------------------------------------

Important: - These are proposed limits, not promises of measured service
capacity. - Make plan limits editable from central configuration or plan
records. - Enforce limits on the backend, not only in the UI. - Do not
allow users to bypass limits by directly calling API endpoints. - Decide
how to handle downgrades when a user exceeds a plan limit. Recommended
initial behavior: preserve records, pause monitoring for excess websites
according to a clearly communicated deterministic rule, and never
silently delete data. - Do not advertise a one-minute interval until
infrastructure capacity and costs have been load-tested.

A Business plan can be added later after real usage and costs are
understood.

------------------------------------------------------------------------

## 4. Roles and Permissions

### Guest

-   View public pages and plan comparison
-   Register and sign in

### User

-   Manage their profile and notification preferences
-   Manage only their own websites, checks, findings, alerts, and
    subscription
-   View and export their own monitoring history where supported
-   Cancel or change their subscription according to billing rules

### Administrator

-   View platform health and aggregate usage
-   Manage plan configuration and account support actions
-   Review operational failures and audit logs
-   Suspend accounts that abuse the service
-   Cannot view or reveal payment secrets or user passwords
-   All sensitive admin actions must be authorized and audited

Use role-based access control or an equivalent permission system. Never
rely on frontend route hiding as the security boundary.

------------------------------------------------------------------------

## 5. Main User Journeys

### First-time user

1.  User creates an account.
2.  User verifies their email.
3.  User opens the dashboard.
4.  User adds a domain they own or are authorized to monitor.
5.  Sentinel performs a safe ownership/authorization verification
    appropriate to the check being enabled.
6.  Sentinel runs an initial baseline check.
7.  The user sees the results and their limitations.
8.  Scheduled monitoring begins according to the user's plan.

### Website incident

1.  A scheduled check runs.
2.  A failure is confirmed according to configurable retry/threshold
    logic.
3.  Sentinel opens or updates an incident.
4.  The user receives an alert according to their preferences and plan.
5.  Later successful checks confirm recovery.
6.  Sentinel records recovery and sends a recovery notification if
    enabled.

Do not alert on every transient failure. Use retry logic and incident
state transitions to reduce false alarms.

### Subscription upgrade

1.  User selects a paid plan.
2.  Backend creates a checkout session using the billing provider
    adapter.
3.  User completes payment at the provider.
4.  Provider sends a signed webhook.
5.  Backend verifies the webhook signature and event.
6.  Subscription state is updated idempotently.
7.  Plan limits and features update on the backend.
8.  User sees the updated subscription state.

Never trust a browser redirect alone as proof of payment.

------------------------------------------------------------------------

## 6. Architecture Requirements

Use a modular, layered architecture. The exact framework and language
are flexible, but the codebase must have the equivalent of the following
layers.

### Request flow

`Route → Authentication/Authorization → Validation → Controller/Handler → Service/Use Case → Repository/Data Access → Database`

The controller should be thin. Business rules belong in services/use
cases/domain logic, not duplicated across route handlers or UI
components.

### Required logical modules

-   Identity and access
-   User profile and preferences
-   Website/domain management
-   Ownership verification
-   Monitoring scheduler
-   Monitoring check runners
-   Check results and history
-   Findings and incidents
-   Notification delivery
-   Plans and entitlements
-   Billing and subscriptions
-   Administration
-   Audit logging
-   Platform health/operations

Modules may be separate packages or folders inside a modular monolith
for the MVP. Do not split into microservices without a demonstrated
need.

### Technology independence

Do not assume a specific framework, language, database, or hosting
vendor. Choose technology based on the developer's environment and
deployment needs. Record the chosen stack in `docs/TECH_STACK.md` and
explain any deviations from this specification.

If the chosen framework does not use MVC terminology, preserve the same
responsibilities with equivalent components.

------------------------------------------------------------------------

## 7. Required Project Structure

Adapt names to the chosen language/framework, but preserve these
responsibilities. The project must not become a collection of
unstructured files.

``` text
sentinel/
├── README.md
├── AGENTS.md                       # Instructions for AI coding agents
├── .env.example                    # Placeholders only; never real secrets
├── .gitignore
├── docs/
│   ├── PRODUCT_SPEC.md             # This specification
│   ├── TECH_STACK.md               # Chosen stack and rationale
│   ├── ARCHITECTURE.md
│   ├── API_SPEC.md
│   ├── DATABASE_SCHEMA.md
│   ├── SECURITY.md
│   ├── BILLING.md
│   ├── MONITORING.md
│   ├── DEPLOYMENT.md
│   ├── TESTING.md
│   └── decisions/
├── frontend/                       # If frontend is a separate application
│   ├── components/
│   ├── pages/ or routes/
│   ├── layouts/
│   ├── features/
│   ├── services/ or api/
│   ├── hooks/ or composables/
│   ├── state/
│   ├── validation/
│   ├── styles/
│   └── tests/
├── backend/                        # If backend is a separate application
│   ├── routes/                     # Route declarations only
│   ├── controllers/                # HTTP input/output; keep thin
│   ├── middleware/
│   ├── requests/ or validators/
│   ├── services/                   # Business logic/use cases
│   ├── models/ or entities/
│   ├── repositories/               # Data access abstractions where useful
│   ├── policies/ or permissions/
│   ├── jobs/ or workers/
│   ├── events/
│   ├── listeners/
│   ├── notifications/
│   ├── providers/                  # Billing, email, DNS, etc. adapters
│   ├── config/
│   ├── database/
│   │   ├── migrations/
│   │   ├── seeders/
│   │   └── factories/
│   └── tests/
├── shared/                         # Shared schemas/types/contracts if useful
├── infrastructure/
│   ├── deployment/
│   ├── monitoring/
│   └── scripts/
└── tests/
    ├── unit/
    ├── integration/
    ├── e2e/
    └── security/
```

This is a logical template, not a requirement to duplicate folders when
the framework already provides an idiomatic structure. For example, if a
framework uses `app/Http/Controllers`, use it instead of inventing a
second `controllers` directory. Always keep route definitions,
controllers, models/entities, business services, validation, data
access, and tests clearly separated.

For a small framework-native app, one root application with
feature-based modules is acceptable. Document the mapping in
`docs/ARCHITECTURE.md`.

### Folder rules

-   **Routes:** Map HTTP methods and URLs to handlers; do not contain
    business logic.
-   **Controllers/handlers:** Validate request flow, call services,
    return consistent responses.
-   **Models/entities:** Represent domain data and enforce appropriate
    invariants.
-   **Services/use cases:** Own business workflows and rules.
-   **Repositories/data access:** Encapsulate complex persistence
    queries when useful.
-   **Middleware/policies:** Authentication, authorization, throttling,
    tenant access.
-   **Jobs/workers:** Long-running or scheduled work; do not run all
    checks inside a user-facing request.
-   **Providers/adapters:** External integrations behind replaceable
    interfaces.
-   **Tests:** Cover behavior and security boundaries at the appropriate
    layer.

------------------------------------------------------------------------

## 8. Data Model

Design the schema before implementing features. Names below are
conceptual and may be adapted.

### Core entities

#### User

-   `id`
-   `name`
-   `email` (unique, normalized)
-   `password_hash` or framework-managed credential reference
-   `email_verified_at`
-   `status`
-   `created_at`, `updated_at`

Never store plaintext passwords.

#### Website

-   `id`
-   `user_id` / tenant owner
-   `display_name`
-   `normalized_domain`
-   `verification_status`
-   `monitoring_status` (active, paused, suspended)
-   `check_interval`
-   `created_at`, `updated_at`

Use normalized domains to prevent duplicates per owner. Validate
hostnames and reject malformed input.

#### DomainVerification

-   `id`
-   `website_id`
-   `method` (DNS TXT or HTTP token, as supported)
-   `token_hash` or safely stored verification token
-   `status`
-   `expires_at`
-   `verified_at`

Verification tokens must be random, expire, and be protected from
disclosure.

#### MonitorCheck

-   `id`
-   `website_id`
-   `check_type`
-   `status`
-   `started_at`
-   `finished_at`
-   `duration_ms`
-   `error_category` (safe, normalized value)
-   `created_at`

#### CheckResult

-   `id`
-   `monitor_check_id`
-   `result_summary`
-   `safe_metadata` (structured, validated, with size limits)
-   `created_at`

Do not store arbitrary response bodies by default. Avoid storing
sensitive query strings, cookies, authorization headers, or personal
data.

#### Finding

-   `id`
-   `website_id`
-   `check_type`
-   `severity`
-   `title`
-   `description`
-   `evidence_summary`
-   `remediation_guidance`
-   `first_detected_at`
-   `last_detected_at`
-   `resolved_at`
-   `status`

Severity should use a documented finite enum, not arbitrary
user-provided strings.

#### Incident

-   `id`
-   `website_id`
-   `incident_type`
-   `status` (open, recovering, resolved)
-   `opened_at`
-   `resolved_at`
-   `last_notified_at`

#### NotificationPreference

-   `id`
-   `user_id`
-   `channel`
-   `event_type`
-   `enabled`
-   `created_at`, `updated_at`

#### NotificationDelivery

-   `id`
-   `user_id`
-   `incident_id` (nullable)
-   `channel`
-   `status`
-   `provider_message_id` (if available)
-   `attempt_count`
-   `next_attempt_at`
-   `sent_at`
-   `created_at`

#### Plan

-   `id`
-   `code`
-   `name`
-   `price`
-   `currency`
-   `billing_interval`
-   `website_limit`
-   `check_interval_min_seconds`
-   `history_retention_days`
-   `features` (validated structured configuration)
-   `active`

#### Subscription

-   `id`
-   `user_id`
-   `plan_id`
-   `provider`
-   `provider_customer_id`
-   `provider_subscription_id`
-   `status`
-   `current_period_start`
-   `current_period_end`
-   `cancel_at_period_end`
-   `created_at`, `updated_at`

#### AuditLog

-   `id`
-   `actor_user_id` (nullable for system events)
-   `action`
-   `resource_type`
-   `resource_id`
-   `safe_metadata`
-   `ip_hash_or_minimized_ip` according to privacy policy
-   `created_at`

Also include framework-required password reset, session, queue, webhook
idempotency, and cache tables as appropriate.

### Data ownership rule

Every tenant-owned query and mutation must be scoped to the
authenticated user's ownership or authorized tenant membership. Never
fetch a record by ID and assume it belongs to the current user.

Add tests proving that User A cannot read, update, delete, export, or
trigger actions on User B's records.

------------------------------------------------------------------------

## 9. Monitoring Behavior

### Uptime check

-   Make a safe HTTP request to the configured host.
-   Use a strict timeout and response-size limit.
-   Record status code, duration, timestamp, and a normalized failure
    category.
-   Do not follow redirects to private/internal addresses.
-   Avoid sending user cookies or credentials.
-   Define whether the check uses `HEAD`, `GET`, or a controlled
    fallback.
-   Treat TLS validation errors as meaningful results; do not silently
    disable certificate validation.

### TLS certificate check

-   Read the certificate presented by the public endpoint.
-   Record expiry time and relevant validation outcome.
-   Notify users at configurable thresholds, for example 14, 7, 3, and 1
    days before expiry.
-   Do not claim to validate every aspect of a website's security from
    certificate expiry alone.

### Security-header check

-   Inspect a safe response's headers.
-   Compare selected headers against documented guidance.
-   Report missing or weak configuration with context.
-   Avoid labeling every missing header a critical vulnerability.
-   Explain that requirements depend on the website's architecture and
    intended behavior.

### DNS checks

-   Record selected public DNS answers and timestamps.
-   Compare with previous snapshots.
-   Alert on meaningful changes only when configured.
-   Explain that legitimate DNS updates can happen and a change is not
    automatically malicious.

### Incident state

-   Use configurable retry thresholds.
-   Avoid opening duplicate incidents for one continuing outage.
-   Record incident transitions and notification attempts.
-   Resolve an incident after the configured recovery criteria pass.
-   Make job execution idempotent so retries do not duplicate records or
    emails.

### Scheduling

-   Use a scheduler and worker/queue system appropriate to the chosen
    stack.
-   Enforce each plan's interval on the server.
-   Add concurrency limits, timeouts, retries with backoff, and
    dead-letter/error handling where supported.
-   Monitor the monitoring system itself.
-   Do not promise 100% uptime or an SLA before it can be measured and
    supported.

------------------------------------------------------------------------

## 10. Critical Security Requirements

Sentinel makes outbound requests to domains supplied by users, so
**Server-Side Request Forgery (SSRF) protection is mandatory**.

### SSRF and network protections

-   Accept only supported HTTP/HTTPS schemes.
-   Reject localhost, loopback, private, link-local, multicast,
    reserved, and cloud metadata addresses.
-   Resolve DNS safely and validate all resolved IPv4 and IPv6 addresses
    before connecting.
-   Revalidate DNS and destination addresses when redirects occur.
-   Disable redirects by default or validate every redirect hop.
-   Prevent DNS rebinding and address-validation/connection
    time-of-check-to-time-of-use gaps as far as the chosen networking
    stack permits.
-   Block access to internal networks and metadata endpoints at the
    network/firewall layer too.
-   Apply request timeouts, response-size limits, concurrency caps, and
    per-user rate limits.
-   Do not allow users to supply arbitrary headers, credentials, request
    methods, or request bodies in the MVP.
-   Test SSRF protections, including alternate IP formats, IPv6,
    redirects, and DNS changes.

If safe outbound requests cannot be guaranteed in the selected stack, do
not launch public monitoring until the gap is addressed.

### Application security

-   Use framework-standard password hashing and session handling.
-   Require email verification before enabling monitoring.
-   Add CSRF protection where cookie-based authentication is used.
-   Use secure, HTTP-only, appropriately SameSite cookies where
    applicable.
-   Apply authorization checks on every protected API route.
-   Rate-limit login, password reset, domain verification, and expensive
    actions.
-   Validate all input on the server.
-   Encode output and avoid unsafe HTML rendering.
-   Use least-privilege database and infrastructure credentials.
-   Never commit secrets, tokens, private keys, or production `.env`
    files.
-   Keep dependencies patched and run dependency/security checks.
-   Avoid leaking secrets or full exception traces in API errors and
    logs.
-   Log security events without storing passwords, access tokens,
    payment data, or unnecessary personal data.

### Payment security

-   Use a reputable hosted checkout/provider SDK where possible.
-   Never store raw card details.
-   Verify webhook signatures.
-   Make webhook processing idempotent.
-   Handle duplicate, delayed, out-of-order, and failed webhook events.
-   Separate payment state from frontend display state.
-   Provide clear cancellation, renewal, refund, and billing-support
    information.

### Authorization

Only monitor websites the user owns or has permission to monitor.
Require verification before enabling ongoing monitoring. Apply
reasonable abuse controls and a documented abuse-report process.

------------------------------------------------------------------------

## 11. API Design

Choose REST, RPC, GraphQL, or another suitable API style based on the
stack. For a REST implementation, use a versioned prefix such as
`/api/v1`.

Conceptual endpoint set:

### Authentication

-   `POST /auth/register`
-   `POST /auth/login`
-   `POST /auth/logout`
-   `POST /auth/forgot-password`
-   `POST /auth/reset-password`
-   `POST /auth/verify-email`

### Websites

-   `GET /websites`
-   `POST /websites`
-   `GET /websites/{id}`
-   `PATCH /websites/{id}`
-   `DELETE /websites/{id}`
-   `POST /websites/{id}/verification`
-   `POST /websites/{id}/pause`
-   `POST /websites/{id}/resume`
-   `POST /websites/{id}/run-check` (rate-limited and
    entitlement-checked)

### Results and incidents

-   `GET /websites/{id}/checks`
-   `GET /websites/{id}/findings`
-   `GET /websites/{id}/incidents`
-   `GET /incidents/{id}`

### Subscription

-   `GET /plans`
-   `GET /subscription`
-   `POST /billing/checkout`
-   `POST /billing/portal` (if supported)
-   `POST /billing/webhooks/{provider}`

### Preferences

-   `GET /settings/notifications`
-   `PATCH /settings/notifications`

These are illustrative routes. Match the chosen framework's conventions
and document the final API in `docs/API_SPEC.md`.

### API conventions

-   Use consistent success and error response formats.
-   Use correct HTTP status codes.
-   Validate IDs, pagination, sorting, and filter values.
-   Never expose internal stack traces.
-   Add pagination to history and list endpoints.
-   Apply authentication, authorization, throttling, and plan
    entitlements server-side.
-   Use idempotency keys for operations that may be retried where
    appropriate.

------------------------------------------------------------------------

## 12. Frontend and UX

### Public pages

-   Landing page
-   Features
-   Pricing
-   Documentation/help
-   Privacy policy
-   Terms of service
-   Acceptable-use policy
-   Sign in / register

### Authenticated pages

-   Overview dashboard
-   Websites
-   Website details
-   Check history
-   Findings
-   Incidents
-   Notification settings
-   Subscription and billing
-   Profile/security settings

### Admin pages

-   Platform overview
-   Users and account status
-   Plan configuration
-   Queue/monitoring health
-   Notification failures
-   Audit log

### Dashboard requirements

-   Show real stored results and the time of the last successful check.
-   Clearly distinguish `Healthy`, `Degraded`, `Down`, `Unknown`, and
    `Paused`.
-   Show when data is stale or a check has not yet run.
-   Display empty, loading, success, and error states.
-   Provide useful retry guidance without exposing internal errors.
-   Use confirmation dialogs for destructive actions.
-   Do not rely on color alone to communicate severity.
-   Make layouts work on mobile screens and desktop.
-   Support keyboard navigation, visible focus, labels, and accessible
    contrast.

Use a coherent design system with reusable components. Avoid building
each page with unrelated styles.

------------------------------------------------------------------------

## 13. Testing and Quality Gates

Every feature must include appropriate tests.

### Unit tests

-   Plan entitlement calculations
-   Domain normalization and validation
-   Incident state transitions
-   Retry/backoff logic
-   Notification rules
-   Billing event processing
-   Security-header evaluation

### Integration tests

-   Database ownership scopes
-   Scheduler and queue behavior
-   Provider adapter behavior
-   Billing webhook verification
-   Email delivery adapter
-   TLS/DNS/HTTP checks using controlled test fixtures

### End-to-end tests

-   Register and verify account
-   Add and verify a website
-   View initial monitoring results
-   Pause and resume monitoring
-   Receive an incident/recovery notification in a test environment
-   Upgrade/downgrade/cancel a subscription using billing test mode

### Security tests

-   Cross-user data access
-   SSRF and redirect protection
-   Authentication and authorization bypass attempts
-   Rate limiting
-   Invalid and oversized input
-   Webhook signature validation and replay/idempotency
-   Secret and error-message leakage

### Definition of done

A feature is not complete until: - It works end to end. - Validation and
authorization exist on the server. - Tests cover normal and important
failure cases. - Loading, empty, and error states exist in the UI. -
Logs are safe and useful. - Documentation is updated. - No fake
production integration or hard-coded secret remains.

------------------------------------------------------------------------

## 14. Observability, Privacy, and Operations

-   Use structured logs with request/job IDs.
-   Track check success/failure rates, queue depth, queue age, job
    duration, notification failures, and billing webhook errors.
-   Configure backups and test restoration.
-   Define retention and deletion rules for checks and audit logs.
-   Provide account deletion and data export according to the privacy
    policy and applicable law.
-   Minimize personal data and document what is collected and why.
-   Do not store full page bodies by default.
-   Keep a health endpoint that reveals no secrets or sensitive
    infrastructure information.
-   Alert the operator when scheduling or workers stop functioning.
-   Document recovery steps for failed jobs, database restore, and
    provider outages.

------------------------------------------------------------------------

## 15. Configuration and Environment

Provide `.env.example` with placeholder names only, such as:

``` dotenv
APP_ENV=local
APP_URL=http://localhost
DATABASE_URL=
QUEUE_CONNECTION=
CACHE_URL=
SESSION_SECRET=
MAIL_HOST=
MAIL_PORT=
MAIL_USERNAME=
MAIL_PASSWORD=
MAIL_FROM_ADDRESS=
BILLING_PROVIDER=
BILLING_SECRET_KEY=
BILLING_WEBHOOK_SECRET=
```

Adapt this to the chosen framework and provider. Do not put real secrets
in this file, source control, screenshots, documentation, or logs.

Fail safely at startup when required production configuration is
missing. Clearly distinguish local, test, staging, and production
configuration.

------------------------------------------------------------------------

## 16. AI/Vibe-Coding Rules

Place these rules in `AGENTS.md` or the equivalent instructions file for
the coding assistant.

### Mandatory rules for the coding agent

1.  Read this specification and existing project documentation before
    changing code.
2.  Inspect the existing codebase first. Do not replace working
    architecture or rewrite unrelated modules without a clear reason.
3.  Confirm the actual technology stack from the repository before
    generating framework-specific code.
4.  If the repository is empty, propose a stack suited to the user's
    environment, explain the trade-offs briefly, and record the decision
    in `docs/TECH_STACK.md`.
5.  Preserve clear route, controller/handler, model/entity,
    service/use-case, validation, data-access, and test
    responsibilities, using the framework's idiomatic equivalents.
6.  Do not put business logic into route declarations, UI components, or
    large controllers.
7.  Build one small, testable feature at a time. Avoid generating the
    entire platform in one unverified pass.
8.  Before coding a feature, state its scope, files likely to change,
    data model/API implications, and acceptance criteria.
9.  After coding, run relevant tests, linting, formatting, type checks,
    and migrations or static analysis where available. Report exactly
    what ran and what failed.
10. Never claim a test passed, a server started, a payment succeeded, or
    an integration works unless it was actually verified.
11. Never invent API keys, credentials, provider capabilities,
    environment values, or production data.
12. Use migrations for schema changes; do not make undocumented manual
    production database edits.
13. Add or update tests and documentation with every meaningful behavior
    change.
14. Keep secrets in environment configuration or a proper secret
    manager.
15. Apply authentication, authorization, tenant isolation, input
    validation, rate limits, and SSRF protections to relevant features.
16. For third-party integrations, create an adapter/provider boundary so
    vendors can be replaced without rewriting business logic.
17. Prefer simple, maintainable solutions over unnecessary abstractions,
    microservices, or dependencies.
18. If a requirement is ambiguous or conflicts with existing code,
    explain the ambiguity and ask only the question needed to proceed
    safely. Do not silently invent important product behavior.
19. Do not delete user data, change production infrastructure, run
    destructive commands, or trigger paid external services without
    explicit authorization.
20. Keep `docs/PRODUCT_SPEC.md`, `docs/ARCHITECTURE.md`,
    `docs/API_SPEC.md`, and `docs/DATABASE_SCHEMA.md` synchronized with
    implementation.

### Feature workflow

For each feature:

1.  Inspect relevant files.
2.  Restate the intended behavior and acceptance criteria.
3.  Design the smallest implementation.
4.  Implement backend/domain behavior first where appropriate.
5.  Add validation, authorization, tests, and failure handling.
6.  Connect the UI.
7.  Run checks and inspect the diff.
8.  Update documentation.
9.  Summarize changed files, commands/tests run, known limitations, and
    the next recommended task.

------------------------------------------------------------------------

## 17. Suggested Implementation Milestones

### Milestone 0 --- Project foundation

-   Inspect environment and select stack
-   Create repository structure
-   Add coding-agent instructions
-   Configure formatting, linting, testing, environment examples, and CI
-   Document architecture and stack

### Milestone 1 --- Identity

-   Registration, login, logout
-   Email verification and password reset
-   User profile and security settings
-   Authentication and authorization tests

### Milestone 2 --- Website ownership

-   Website CRUD
-   Domain normalization
-   Ownership verification
-   SSRF-safe URL validation and outbound-request layer
-   Cross-user access tests

### Milestone 3 --- First monitoring checks

-   Uptime check worker
-   TLS certificate check
-   Security-header check
-   DNS snapshot
-   Check history and finding records
-   Scheduler and queue failure handling

### Milestone 4 --- Incidents and notifications

-   Incident state machine
-   Retry thresholds and recovery logic
-   Email notifications
-   Notification preferences and delivery history

### Milestone 5 --- Plans and billing

-   Free plan enforcement
-   Hosted checkout integration
-   Signed webhooks and idempotent processing
-   Subscription lifecycle and plan entitlements
-   Test-mode billing flows

### Milestone 6 --- Admin and production readiness

-   Admin permissions and audit log
-   Queue and scheduler health
-   Backups and restore procedure
-   Abuse controls and rate limits
-   Security review and deployment documentation

### Milestone 7 --- Controlled launch

-   Private beta
-   Load and cost testing
-   Fix false positives and reliability issues
-   Publish terms, privacy, acceptable-use, and support information
-   Public launch only when SSRF defenses and tenant isolation have been
    verified

------------------------------------------------------------------------

## 18. First Prompt to Give an AI Coding Assistant

Copy and use this prompt after placing this file in the repository:

> Read `docs/PRODUCT_SPEC.md` and `AGENTS.md` completely before making
> changes. Inspect the existing repository and identify its actual
> language, framework, package manager, and current structure. Do not
> assume a stack if the repository already has one.
>
> Do not implement the whole application yet. Start with Milestone 0
> only: inspect the project, propose or document the technology stack,
> create a maintainable folder structure with clear route,
> controller/handler, model/entity, service/use-case, validation,
> data-access, and test responsibilities using idiomatic framework
> conventions, add environment examples with placeholders, and create or
> update the foundational documentation and development scripts.
>
> Preserve existing working code. Do not add real credentials, fake
> integrations, or unnecessary dependencies. Run the available checks
> and report the exact files created/changed, decisions made, commands
> run, and any failures. Stop after Milestone 0 and wait for review
> before proceeding.

------------------------------------------------------------------------

## 19. Release Checklist

Before allowing public registrations:

-   [ ] Email verification is enforced.
-   [ ] Cross-tenant access tests pass.
-   [ ] SSRF protection is implemented and independently reviewed.
-   [ ] Outbound requests have strict timeouts and response limits.
-   [ ] Abuse prevention and rate limiting are enabled.
-   [ ] Payment webhooks are verified and idempotent.
-   [ ] Secrets are absent from source control and logs.
-   [ ] Monitoring jobs and queues have health checks.
-   [ ] Backups and restoration have been tested.
-   [ ] Privacy policy, terms, and acceptable-use policy are published.
-   [ ] Plan limits are enforced on the backend.
-   [ ] Billing, cancellation, and failure states have been tested.
-   [ ] No demo data is presented as live customer data.
-   [ ] Operational costs have been measured under realistic load.
-   [ ] Public launch has an incident response and abuse-report process.

------------------------------------------------------------------------

## Final Direction

Sentinel should be a **maintainable, secure, technology-independent
SaaS**. The exact implementation stack can change, but its product
scope, modular architecture, clear folder responsibilities, subscription
behavior, privacy requirements, and security boundaries must remain
intact.

Start with the foundation and one verified feature at a time.
Reliability and trust matter more than the number of features.
