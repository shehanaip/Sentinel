from django.urls import path

from .views import ConfirmMarketingContactView, MarketingCampaignsView, MarketingContactsView, MarketingImportView, MarketingUnsubscribeView, ResendContactConfirmationView, SendMarketingCampaignView

urlpatterns = [
    path("contacts/", MarketingContactsView.as_view(), name="marketing-contacts"),
    path("contacts/import/", MarketingImportView.as_view(), name="marketing-contact-import"),
    path("contacts/<str:contact_id>/resend-confirmation/", ResendContactConfirmationView.as_view(), name="marketing-contact-resend-confirmation"),
    path("campaigns/", MarketingCampaignsView.as_view(), name="marketing-campaigns"),
    path("campaigns/send/", SendMarketingCampaignView.as_view(), name="send-marketing-campaign"),
    path("unsubscribe/", MarketingUnsubscribeView.as_view(), name="marketing-unsubscribe"),
    path("confirm/", ConfirmMarketingContactView.as_view(), name="marketing-confirm"),
]
