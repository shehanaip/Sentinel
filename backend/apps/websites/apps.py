from django.apps import AppConfig


class WebsitesConfig(AppConfig):
    default_auto_field = "django_mongodb_backend.fields.ObjectIdAutoField"
    name = "apps.websites"
    label = "websites"