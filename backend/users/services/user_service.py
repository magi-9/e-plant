from django.contrib.auth import get_user_model

from services.email import AuthEmailService

User = get_user_model()


class UserService:
    @staticmethod
    def register_user(
        *,
        email,
        password,
        title="",
        is_active=False,
        send_verification_email=True,
    ):
        user = User.objects.create_user(
            email=email,
            password=password,
            title=title,
            is_active=is_active,
        )

        if send_verification_email:
            AuthEmailService().send_verification_email(user)

        return user
