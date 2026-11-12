from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("api/auth/", include("apps.accounts.urls")),
    path("admin/", admin.site.urls),
    path("api/websites/", include("apps.websites.urls")),
    path("api/monitoring/", include("apps.monitoring.urls")),
    path("api/security/", include("apps.security.urls")),
    path("api/email-marketing/", include("apps.email_marketing.urls")),
    path("api/email-lookup/", include("apps.email_marketing.lookup_urls")),
    path("api/seo/", include("apps.seo.urls")),
    path("api/", include("apps.core.urls")),
]
