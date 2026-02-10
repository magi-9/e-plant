from django.contrib.auth.models import AbstractUser
from django.db import models

class CustomUser(AbstractUser):
    # We can add more fields here later (e.g. phone, address)
    pass
