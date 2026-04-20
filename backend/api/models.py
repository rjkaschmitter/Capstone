from django.db import models
from django.contrib.auth.models import User

class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    access_token = models.CharField(max_length=255, null=True, blank=True)
    plaid_item_id = models.CharField(max_length=255, null=True, blank=True)
    plaid_cursor = models.CharField(max_length=500, null=True, blank=True)
    llm_level = models.IntegerField(default=1)

    def __str__(self):
        return self.user.username

class Transaction(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    transaction_id = models.CharField(max_length=255, unique=True, null=True, blank=True)
    name = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    date = models.DateField()
    category = models.CharField(max_length=255)
    source = models.CharField(max_length=20, choices=[("plaid", "Plaid"), ("manual", "Manual")])

class BankAccount(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    access_token = models.CharField(max_length=255)
    account_id = models.CharField(max_length=255)
    institution_name = models.CharField(max_length=255)
    current_balance = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

class Budget(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    category = models.CharField(max_length=255)
    month = models.DateField()
    monthly_limit = models.DecimalField(max_digits=10, decimal_places=2)
    sent_email = models.BooleanField(default=False)

    class Meta:
        unique_together = ("user", "category")