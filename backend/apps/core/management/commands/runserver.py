from django.conf import settings
from django.core.management.commands.runserver import Command as RunserverCommand
from django.db import DatabaseError
from pymongo.errors import PyMongoError


class Command(RunserverCommand):
    """Keep local API startup available while Atlas is temporarily unreachable."""

    def check_migrations(self):
        try:
            super().check_migrations()
        except (DatabaseError, PyMongoError):
            if not settings.DEBUG:
                raise
            self.stderr.write(
                self.style.WARNING(
                    "MongoDB migration check could not connect. The API is starting; "
                    "check GET /api/health/ and your Atlas network access settings."
                )
            )