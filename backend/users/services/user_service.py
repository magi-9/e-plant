from django.contrib.auth import get_user_model

from services.email import AuthEmailService

User = get_user_model()


class UserService:
    @staticmethod
    def register_user(
        *, email, password, is_active=False, send_verification_email=True
    ):
        user = User.objects.create_user(
            email=email,
            password=password,
            is_active=is_active,
        )

        if send_verification_email:
            AuthEmailService().send_verification_email(user)

        return user
