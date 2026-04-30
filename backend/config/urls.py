import ipaddress

from django.conf import settings
from django.contrib import admin
from django.http import HttpResponse, HttpResponseForbidden
from django.urls import include, path, re_path
from django.views.static import serve
from django_prometheus import exports

from orders.views import ShippingRateListView
from users.jwt_views import (
    CookieTokenObtainPairView,
    cookie_logout,
    cookie_token_refresh,
)

_PRIVATE_NETS = [
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("127.0.0.0/8"),
]


def _metrics_view(request):
    """Only allow requests from private network IPs (Grafana Alloy, etc.)."""
    ip_str = request.META.get("REMOTE_ADDR", "")
    try:
        ip = ipaddress.ip_address(ip_str)
        if not any(ip in net for net in _PRIVATE_NETS):
            return HttpResponseForbidden()
    except ValueError:
        return HttpResponseForbidden()
    return exports.ExportToDjangoView(request)


def _health_view(request):
    """HTTP readiness check: verifies the app and DB are reachable."""
    try:
        from django.db import connection

        connection.ensure_connection()
    except Exception:
        return HttpResponse("db unavailable", status=503, content_type="text/plain")
    return HttpResponse("ok", content_type="text/plain")


urlpatterns = [
    # Mount Django admin on a non-conflicting path to avoid colliding
    # with the frontend single-page-app `/admin` routes. This prevents
    # the Django admin login from being served at `/admin/...` on the
    # public frontend host.
    path("django-admin/", admin.site.urls),
    path("api/auth/", include("users.urls")),
    path("api/products/", include("products.urls")),
    path("api/orders/", include("orders.urls")),
    path("api/shipping-rates/", ShippingRateListView.as_view(), name="shipping_rates"),
    path(
        "api/auth/login/", CookieTokenObtainPairView.as_view(), name="token_obtain_pair"
    ),
    path("api/auth/refresh/", cookie_token_refresh, name="token_refresh"),
    path("api/auth/logout/", cookie_logout, name="logout"),
    path("api/health/", _health_view, name="health"),
    path("metrics/", _metrics_view, name="prometheus-django-metrics"),
]

# Uploaded files must be reachable in staging/prod behind Traefik as /media/.
# django.conf.urls.static.static() is disabled when DEBUG=False, so use an
# explicit serve route for this deployment setup.
urlpatterns += [
    re_path(
        rf"^{settings.MEDIA_URL.lstrip('/')}(?P<path>.*)$",
        serve,
        {"document_root": settings.MEDIA_ROOT},
    )
]
