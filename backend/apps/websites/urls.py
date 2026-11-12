from django.urls import path
from .views import VerifyWebsiteView, WebsiteDetailView, WebsiteListCreateView

urlpatterns = [
    path("", WebsiteListCreateView.as_view(), name="website-list-create"),
    path("<str:pk>/", WebsiteDetailView.as_view(), name="website-detail"),
    path("<str:pk>/verify/", VerifyWebsiteView.as_view(), name="website-verify"),
]