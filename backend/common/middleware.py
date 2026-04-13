import logging
from django.utils.deprecation import MiddlewareMixin

logger = logging.getLogger("django.security.admin")


class AdminAuditMiddleware(MiddlewareMixin):
    """Log all admin actions for audit trail and compliance."""

    def process_view(self, request, view_func, view_args, view_kwargs):
        # Only log staff/admin actions
        if request.user.is_staff and request.method in [
            "POST",
            "PUT",
            "DELETE",
            "PATCH",
        ]:
            try:
                # Get request body safely
                body = request.body.decode("utf-8")[:500]
            except UnicodeDecodeError:
                body = "[binary data]"

            # Extract user email
            user_email = getattr(request.user, "email", request.user.username)

            # Log the admin action
            logger.warning(
                f"ADMIN_ACTION | User: {user_email} | "
                f"Method: {request.method} | "
                f"Path: {request.path} | "
                f"IP: {self.get_client_ip(request)} | "
                f"Body: {body}"
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
