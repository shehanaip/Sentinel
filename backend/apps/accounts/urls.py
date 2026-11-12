from django.urls import path
from .views import CurrentUserView, CsrfView, LoginView, LogoutView, PasswordChangeView, ProfilePreferencesView, RegisterView, VerifyEmailView

urlpatterns = [
    path("csrf/", CsrfView.as_view(), name="csrf"),
    path("register/", RegisterView.as_view(), name="register"),
    path("verify-email/", VerifyEmailView.as_view(), name="verify-email"),
    path("login/", LoginView.as_view(), name="login"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("me/", CurrentUserView.as_view(), name="current-user"),
    path("profile/", ProfilePreferencesView.as_view(), name="profile-preferences"),
    path("password/", PasswordChangeView.as_view(), name="password-change"),
]
