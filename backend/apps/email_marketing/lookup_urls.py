from django.urls import path

from .lookup_views import ConfirmLookupEmailView, ConfirmSharedEmailView, EmailLookupView, EmailShareRequestsView, SendLookupConfirmationView, SubmitSharedEmailView

urlpatterns = [
    path("check/", EmailLookupView.as_view(), name="email-lookup-check"),
    path("send-confirmation/", SendLookupConfirmationView.as_view(), name="email-lookup-send-confirmation"),
    path("confirm/", ConfirmLookupEmailView.as_view(), name="email-lookup-confirm"),
    path("share-requests/", EmailShareRequestsView.as_view(), name="email-share-requests"),
    path("share-requests/submit/", SubmitSharedEmailView.as_view(), name="email-share-submit"),
    path("share-requests/confirm/", ConfirmSharedEmailView.as_view(), name="email-share-confirm"),
]
