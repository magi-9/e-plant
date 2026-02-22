from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from django.contrib.auth import get_user_model
from .serializers import UserRegistrationSerializer, UserSerializer

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    serializer_class = UserRegistrationSerializer
    permission_classes = (permissions.AllowAny,)


from .serializers import UserRegistrationSerializer, UserSerializer, UserUpdateSerializer, GlobalSettingsSerializer
from .models import GlobalSettings

class MeView(generics.RetrieveUpdateAPIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return UserUpdateSerializer
        return UserSerializer

    def get_object(self):
        return self.request.user


class GlobalSettingsView(generics.RetrieveUpdateAPIView):
    serializer_class = GlobalSettingsSerializer
    
    def get_permissions(self):
        if self.request.method in ['PUT', 'PATCH']:
            return [permissions.IsAdminUser()]
        return [permissions.AllowAny()]
        
    def get_object(self):
        return GlobalSettings.load()


class AdminUsersListView(generics.ListAPIView):
    """Admin endpoint to list all users"""
    queryset = User.objects.all().order_by('-date_joined')
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
            return Response({"error": "Cannot delete yourself"}, status=status.HTTP_400_BAD_REQUEST)
        return super().destroy(request, *args, **kwargs)


@api_view(['PATCH'])
@permission_classes([IsAdminUser])
def admin_toggle_staff(request, user_id):
    """Admin endpoint to toggle user's staff status"""
    try:
        user = User.objects.get(id=user_id)
        if user == request.user:
            return Response({"error": "Cannot toggle your own status"}, status=status.HTTP_400_BAD_REQUEST)
        user.is_staff = not user.is_staff
        user.save()
        serializer = UserSerializer(user)
        return Response(serializer.data)
    except User.DoesNotExist:
        return Response(
            {"error": "User not found"},
            status=status.HTTP_404_NOT_FOUND
        )
