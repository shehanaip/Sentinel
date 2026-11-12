from pymongo import MongoClient
from pymongo.errors import ConfigurationError, OperationFailure, PyMongoError, ServerSelectionTimeoutError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings


_mongo_client = None


@api_view(["GET"])
@permission_classes([AllowAny])
def health(request):
    """Confirm the API can reach its configured MongoDB deployment."""
    global _mongo_client
    try:
        if _mongo_client is None:
            _mongo_client = MongoClient(
                settings.MONGODB_URI,
                connectTimeoutMS=10000,
                serverSelectionTimeoutMS=8000,
                socketTimeoutMS=5000,
            )
        _mongo_client.admin.command("ping", maxTimeMS=4000)
    except ConfigurationError:
        _mongo_client = None
        reason = "database_dns"
    except ServerSelectionTimeoutError:
        reason = "database_unreachable"
    except OperationFailure:
        reason = "database_authentication"
    except PyMongoError:
        reason = "database_error"
    else:
        return Response({"status": "ok", "database": "ok"})
    if reason:
        return Response(
            {"status": "unavailable", "database": "unavailable", "reason": reason},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    return Response({"status": "unavailable", "database": "unavailable", "reason": "database_error"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
