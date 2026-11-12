from django.urls import path

from .views import RunDomainSecurityAuditView, RunSecurityAuditView, SecurityAuditHistoryView

urlpatterns = [
    path("audits/", SecurityAuditHistoryView.as_view(), name="security-audit-history"),
    path("websites/<str:website_id>/audit/", RunSecurityAuditView.as_view(), name="run-security-audit"),
    path("websites/<str:website_id>/domain-audit/", RunDomainSecurityAuditView.as_view(), name="run-domain-security-audit"),
]
