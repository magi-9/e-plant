from rest_framework import generics, permissions, status, views
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from django.contrib.auth import get_user_model
from django.utils.http import urlsafe_base64_decode
from django.utils.encoding import force_str
from django.contrib.auth.tokens import default_token_generator
from .serializers import UserRegistrationSerializer, UserSerializer

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    serializer_class = UserRegistrationSerializer
    permission_classes = (permissions.AllowAny,)


class VerifyEmailView(views.APIView):
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        uidb64 = request.data.get("uid")
        token = request.data.get("token")

        if not uidb64 or not token:
            return Response(
                {"error": "Chýbajúce údaje pre overenie."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            user = None

        if user is not None and default_token_generator.check_token(user, token):
            user.is_active = True
            user.save()
            return Response(
                {"success": "E-mail bol úspešne overený. Teraz sa môžete prihlásiť."},
                status=status.HTTP_200_OK,
            )
        else:
            return Response(
                {"error": "Overovací odkaz je neplatný alebo už expiroval."},
                status=status.HTTP_400_BAD_REQUEST,
            )


from .serializers import (
    UserRegistrationSerializer,
    UserSerializer,
    UserUpdateSerializer,
    GlobalSettingsSerializer,
)
from .models import GlobalSettings


class MeView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get_serializer_class(self):
        if self.request.method in ["PUT", "PATCH"]:
            return UserUpdateSerializer
        return UserSerializer

    def get_object(self):
        return self.request.user


class GlobalSettingsView(generics.RetrieveUpdateAPIView):
    serializer_class = GlobalSettingsSerializer

    def get_permissions(self):
        if self.request.method in ["PUT", "PATCH"]:
            return [permissions.IsAdminUser()]
        return [permissions.AllowAny()]

    def get_object(self):
        return GlobalSettings.load()


class AdminUsersListView(generics.ListAPIView):
    """Admin endpoint to list all users"""

    queryset = User.objects.all().order_by("-date_joined")
    serializer_class = UserSerializer
    permission_classes = (IsAdminUser,)


class AdminUserCreateView(generics.CreateAPIView):
    """Admin endpoint to create a user"""

    queryset = User.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = (IsAdminUser,)


class AdminUserUpdateView(generics.UpdateAPIView):
    """Admin endpoint to update user"""

    queryset = User.objects.all()
    from .serializers import AdminUserUpdateSerializer

    serializer_class = AdminUserUpdateSerializer
    permission_classes = (IsAdminUser,)


class AdminUserDeleteView(generics.DestroyAPIView):
    """Admin endpoint to delete a user"""

    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = (IsAdminUser,)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance == request.user:
            return Response(
                {"error": "Cannot delete yourself"}, status=status.HTTP_400_BAD_REQUEST
            )
        return super().destroy(request, *args, **kwargs)


@api_view(["PATCH"])
@permission_classes([IsAdminUser])
def admin_toggle_staff(request, user_id):
    """Admin endpoint to toggle user's staff status"""
    try:
        user = User.objects.get(id=user_id)
        if user == request.user:
            return Response(
                {"error": "Cannot toggle your own status"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user.is_staff = not user.is_staff
        user.save()
        serializer = UserSerializer(user)
        return Response(serializer.data)
    except User.DoesNotExist:
        return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)
