from django.db import models
from django.contrib.auth.models import User

class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    access_token = models.CharField(max_length=255, null=True, blank=True)

    def __str__(self):
        return self.user.username

class BankAccount(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    access_token = models.CharField(max_length=255)
    account_id = models.CharField(max_length=255)
    institution_name = models.CharField(max_length=255)
    current_balance = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

class Budget(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    category = models.CharField(max_length=100)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    month = models.DateField()  