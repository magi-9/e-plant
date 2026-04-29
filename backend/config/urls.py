from django.conf import settings
from django.contrib import admin
from django.urls import include, path, re_path
from django.views.static import serve
from django_prometheus import exports
from rest_framework_simplejwt.views import TokenRefreshView

from orders.views import ShippingRateListView
from users.jwt_views import CustomTokenObtainPairView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("users.urls")),
    path("api/products/", include("products.urls")),
    path("api/orders/", include("orders.urls")),
    path("api/shipping-rates/", ShippingRateListView.as_view(), name="shipping_rates"),
    path(
        "api/auth/login/", CustomTokenObtainPairView.as_view(), name="token_obtain_pair"
    ),
    path("api/auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("metrics/", exports.ExportToDjangoView, name="prometheus-django-metrics"),
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
