from django.apps import AppConfig
from django_mongodb_backend.fields import ObjectIdAutoField


class MonitoringConfig(AppConfig):
    default_auto_field = "django_mongodb_backend.fields.ObjectIdAutoField"
    name = "apps.monitoring"
