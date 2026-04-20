from django.urls import path
from . import views

urlpatterns = [
    path("register/", views.register),
    path("login/", views.login_api),  
    path("logout/", views.logout_api),  
    path("update_email/", views.update_email),  
    path("update_password/", views.update_password),  
    path("update_username/", views.update_username),  
    path("user_data/", views.user_data),  
    path("plaid_link_token/", views.create_link_token),
    path("plaid_exchange_public_token/", views.exchange_public_token),
    path("plaid_accounts/", views.plaid_accounts),
    path("plaid_transactions/", views.plaid_transactions),
    path("whoami/", views.whoami),
    path("simulate-spending/", views.trigger_sandbox_spending, name="simulate-spending"),
    path("plaid_webhook/", views.plaid_webhook, name="plaid_webhook"),
    path("plaid_transactions_refresh/", views.plaid_transactions_refresh),
    path("transactions/", views.get_transactions),
    path("transactions/add/", views.addManualTransaction),
    path("dashboard/", views.dashboard),
    path("budget/", views.setBudget),
    path("budgets/", views.get_budgets),
    path("reset/", views.delete_all_budgets_and_transactions),
   

]
