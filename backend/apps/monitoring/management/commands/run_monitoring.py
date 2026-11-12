import time

from django.core.management.base import BaseCommand

from apps.monitoring.services import perform_uptime_check
from apps.websites.models import Website


class Command(BaseCommand):
    help = "Run bounded uptime checks for verified websites every five minutes."

    def add_arguments(self, parser):
        parser.add_argument("--once", action="store_true", help="Run one check pass and exit.")
        parser.add_argument("--interval-seconds", type=int, default=300)
        parser.add_argument("--limit", type=int, default=100, help="Maximum sites per pass.")

    def handle(self, *args, **options):
        interval = max(options["interval_seconds"], 30)
        limit = min(max(options["limit"], 1), 1000)
        while True:
            started = time.monotonic()
            sites = Website.objects.filter(verification_status=Website.VerificationStatus.VERIFIED).order_by("last_uptime_check_at", "created_at")[:limit]
            count = 0
            for website in sites:
                check = perform_uptime_check(website)
                count += 1
                self.stdout.write(f"{website.domain}: {check.status} ({check.http_status or check.error_category}, {check.duration_ms} ms)")
            self.stdout.write(f"Completed {count} uptime checks.")
            if options["once"]:
                return
            time.sleep(max(0, interval - (time.monotonic() - started)))
