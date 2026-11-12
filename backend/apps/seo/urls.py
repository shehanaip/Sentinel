from django.urls import path
from .views import BacklinkCandidateView, RunSEOAuditView, SEOAuditHistoryView

urlpatterns = [
    path("audits/", SEOAuditHistoryView.as_view(), name="seo-audit-history"),
    path("websites/<str:website_id>/audit/", RunSEOAuditView.as_view(), name="run-seo-audit"),
    path("websites/<str:website_id>/backlinks/", BacklinkCandidateView.as_view(), name="check-backlink-candidates"),
]
