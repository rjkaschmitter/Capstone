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
    #path("plaid_transactions_sync/", views.plaid_transactions_sync),
    path("plaid_transactions_refresh/", views.plaid_transactions_refresh),
    path("transactions/", views.get_transactions),
    path("transactions/add/", views.addManualTransaction),

]
