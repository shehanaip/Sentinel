from django.test import SimpleTestCase
from rest_framework.test import APIRequestFactory

from .views import WebsiteCreateThrottle, WebsiteListCreateView


class WebsiteListCreateThrottleTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()

    def test_list_requests_are_not_counted_against_creation_limit(self):
        view = WebsiteListCreateView()
        view.request = self.factory.get("/api/websites/")

        self.assertEqual(view.get_throttles(), [])

    def test_creation_requests_remain_throttled(self):
        view = WebsiteListCreateView()
        view.request = self.factory.post("/api/websites/")

        throttles = view.get_throttles()
        self.assertEqual(len(throttles), 1)
        self.assertIsInstance(throttles[0], WebsiteCreateThrottle)
