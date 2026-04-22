import logging
import uuid

import sentry_sdk
from django.utils.deprecation import MiddlewareMixin

logger = logging.getLogger("django.security.admin")


class RequestContextMiddleware(MiddlewareMixin):
    """Attach a unique request_id to each request and enrich the Sentry scope."""

    def process_request(self, request):
        request_id = str(uuid.uuid4())
        request.request_id = request_id
        sentry_sdk.set_tag("request_id", request_id)


class AdminAuditMiddleware(MiddlewareMixin):
    """Log all admin actions for audit trail and compliance.

    NOTE: Logs action metadata only. Request body is NOT logged to prevent
    leaking credentials, passwords, or PII.
    """

    def process_view(self, request, view_func, view_args, view_kwargs):
        # Only log staff/admin actions
        if request.user.is_staff and request.method in [
            "POST",
            "PUT",
            "DELETE",
            "PATCH",
        ]:
            # Extract user email — CustomUser has no username field, use get_username() as fallback
            user_email = (
                getattr(request.user, "email", None) or request.user.get_username()
            )

            # Log the admin action WITHOUT request body (prevents credential leaking)
            logger.warning(
                f"ADMIN_ACTION | User: {user_email} | "
                f"Method: {request.method} | "
                f"Path: {request.path} | "
                f"IP: {self.get_client_ip(request)}"
            )
        return None

    @staticmethod
    def get_client_ip(request):
        """Get client IP from request."""
        x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded_for:
            ip = x_forwarded_for.split(",")[0]
        else:
            ip = request.META.get("REMOTE_ADDR")
        return ip
