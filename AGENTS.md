# Sentinel project instructions

- Read `Sentinel_Product_Spec.md` and `docs/TECH_STACK.md` before changing architecture or implementing a feature.
- Keep the frontend in `frontend/` and the Django API in `backend/`. Keep the backend a modular monolith unless measured needs justify a different architecture.
- Use Next.js, React, TypeScript, Bootstrap 5, and custom CSS in the frontend. Use Django REST Framework with MongoDB's official `django-mongodb-backend`; do not substitute Djongo without an explicit architecture review.
- Keep each feature's routes, DRF views, serializers, models, permissions, services, and tests in its Django app. Views stay thin; business rules belong in services/domain logic.
- Shared Django middleware belongs in `backend/config/middleware/`. Use DRF permissions and feature services for feature authorization.
- Treat backend authorization and tenant isolation as the security boundary. Protect monitoring outbound requests against SSRF, DNS rebinding, redirects to private IPs, excessive timeouts, and oversized responses.
- Keep secrets out of source control. Use `.env.example` for placeholder configuration only.
- Build one vertical feature at a time. Add/update tests and docs with behavior changes, and report exactly which checks ran. Never claim an unrun check succeeded.
- Before coding a feature, state scope, likely files, data/API implications, and acceptance criteria. Preserve existing work and avoid unrelated rewrites.
- Do not delete user data, modify production infrastructure, or trigger paid services without explicit authorization.
