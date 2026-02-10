import pytest

def test_dummy():
    assert 1 + 1 == 2

@pytest.mark.django_db
def test_db_access():
    """Verify database access is working"""
    from django.contrib.auth import get_user_model
    User = get_user_model()
    assert User.objects.count() == 0
