# Sentinel technology stack

## Decision

- **Frontend:** Next.js, React, and TypeScript. Use Bootstrap 5 for responsive layout and accessible baseline components, with project-owned CSS for Sentinel's visual identity.
- **Backend:** Django with Django REST Framework (DRF), organized as a modular monolith.
- **Database:** MongoDB through MongoDB's official Django MongoDB Backend (`django-mongodb-backend`), using Django models and DRF. The initial setup pins matching Django and backend versions; check the official compatibility table before upgrades.
- **Background jobs:** Celery workers with Redis as the broker/cache. Redis is not the system of record.

## Why this fit

This keeps the requested Django/DRF backend and MongoDB database while using the maintained MongoDB backend rather than an older third-party SQL-to-document compatibility layer. Django provides the application structure, authentication conventions, admin and migrations; MongoDB stores the application's documents. Feature logic stays in Django apps and service modules so it can be tested and maintained without putting business rules in route handlers.

## Database and model guidance

Model users, websites, checks, findings/incidents, subscriptions, and audit events as explicit document-backed Django models. Define indexes and uniqueness constraints for tenant ownership, normalized domains, event idempotency, and time-based history. Keep document references and embedding choices deliberate; do not assume relational joins or transaction behavior without checking MongoDB backend support. Add retention policies for high-volume check history.

## Request and module layout

- `backend/config/urls.py` is the root route table; each feature app owns its `urls.py` and DRF views.
- Django calls request handlers **views** (the controller role). Keep them thin: validate/serialize input, call feature services, return responses.
- Each app owns its models, serializers, services, permissions and tests. Add repositories only where they create a useful data-access boundary; avoid boilerplate wrappers around every ORM call.
- Shared HTTP middleware belongs in `backend/config/middleware/` and is registered in Django settings. Feature authorization belongs in DRF permissions/services, not custom global middleware.
- `frontend/src/app/` owns Next.js routes and layouts. Reusable UI belongs in `components/`; domain-specific screens and components belong in `features/`.

## Security and operational boundaries

The browser calls the Django API; backend authorization and tenant isolation are authoritative. The monitoring outbound-request layer must enforce domain ownership, SSRF protections, DNS/IP revalidation, strict timeouts, and response-size limits. Never put database credentials in source control. Local development may use a local MongoDB URI; hosted deployments can use MongoDB Atlas.

## Initial setup policy

Create the structure and documentation first. Pin compatible package versions when implementing the runnable foundation, based on the official Django MongoDB Backend compatibility matrix; do not silently substitute Djongo. Keep frontend/backend dependency management separate. This decision records a starting architecture, not a claim that a production MongoDB deployment or integration has been configured or tested.
Configuration follows the official MongoDB project-template requirement: Django admin, auth, and content-type apps each use MongoDB's ObjectId auto field. See MongoDB's [Django MongoDB Backend setup guide](https://www.mongodb.com/docs/languages/python/django-mongodb/current/get-started/) and [compatibility table](https://www.mongodb.com/docs/drivers/compatibility/?driver-language=python&python-driver-framework=django).
