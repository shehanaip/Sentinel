from django.urls import path
from .views import RunUptimeCheckView, UptimeHistoryView

urlpatterns = [
    path("checks/", UptimeHistoryView.as_view(), name="uptime-history"),
    path("websites/<str:website_id>/check/", RunUptimeCheckView.as_view(), name="run-uptime-check"),
]
