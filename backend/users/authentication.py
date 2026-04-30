from rest_framework_simplejwt.authentication import JWTAuthentication


class CookieJWTAuthentication(JWTAuthentication):
    """Reads the JWT access token from the 'access_token' httpOnly cookie."""

    COOKIE_NAME = "access_token"

    def authenticate(self, request):
        raw_token = request.COOKIES.get(self.COOKIE_NAME)
        if raw_token is None:
            return None
        validated_token = self.get_validated_token(raw_token)
        return self.get_user(validated_token), validated_token
