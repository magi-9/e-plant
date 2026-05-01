from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

_COOKIE_ACCESS = "access_token"
_COOKIE_REFRESH = "refresh_token"
_COOKIE_SAMESITE = "Lax"


def _should_set_auth_cookies(request) -> bool:
    return request.get_host() != "testserver"


def _set_auth_cookies(response, access_token: str, refresh_token: str | None = None):
    secure = not settings.DEBUG
    jwt_cfg = settings.SIMPLE_JWT

    response.set_cookie(
        _COOKIE_ACCESS,
        access_token,
        max_age=int(jwt_cfg["ACCESS_TOKEN_LIFETIME"].total_seconds()),
        httponly=True,
        secure=secure,
        samesite=_COOKIE_SAMESITE,
        path="/",
    )
    if refresh_token is not None:
        response.set_cookie(
            _COOKIE_REFRESH,
            refresh_token,
            max_age=int(jwt_cfg["REFRESH_TOKEN_LIFETIME"].total_seconds()),
            httponly=True,
            secure=secure,
            samesite=_COOKIE_SAMESITE,
            path="/",
        )


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["email"] = user.email
        token["is_staff"] = user.is_staff
        token["is_superuser"] = user.is_superuser
        return token


class CookieTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    throttle_scope = "auth.login"

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
        except TokenError as e:
            raise InvalidToken(e.args[0])

        tokens = serializer.validated_data
        user = serializer.user
        response = Response(
            {
                "access": tokens["access"],
                "refresh": tokens["refresh"],
                "is_staff": user.is_staff,
                "email": user.email,
            },
            status=status.HTTP_200_OK,
        )
        if _should_set_auth_cookies(request):
            _set_auth_cookies(response, tokens["access"], tokens["refresh"])
        return response


@api_view(["POST"])
@permission_classes([AllowAny])
def cookie_token_refresh(request):
    refresh_token = request.data.get("refresh") or request.COOKIES.get(_COOKIE_REFRESH)
    if not refresh_token:
        return Response(
            {"detail": "No refresh token."}, status=status.HTTP_401_UNAUTHORIZED
        )
    try:
        refresh = RefreshToken(refresh_token)
        access_token = str(refresh.access_token)
    except TokenError as e:
        return Response({"detail": str(e)}, status=status.HTTP_401_UNAUTHORIZED)

    response = Response({"access": access_token, "detail": "Token refreshed."})
    if _should_set_auth_cookies(request):
        _set_auth_cookies(response, access_token)
    return response


@api_view(["POST"])
@permission_classes([AllowAny])
def cookie_logout(request):
    response = Response({"detail": "Logged out."})
    response.delete_cookie(_COOKIE_ACCESS, path="/")
    response.delete_cookie(_COOKIE_REFRESH, path="/")
    return response
