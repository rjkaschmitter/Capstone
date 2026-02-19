from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.models import User
from .models import BankAccount, Budget, Profile
from django.contrib.auth.decorators import login_required
from datetime import datetime, timedelta
import json
from django.contrib.auth import authenticate, login, logout
from .plaid_client import client

from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser

from plaid.model.item_public_token_exchange_request import ItemPublicTokenExchangeRequest
from plaid.model.accounts_get_request import AccountsGetRequest
from plaid.model.products import Products
from plaid.model.country_code import CountryCode

from plaid.model.transactions_get_request import TransactionsGetRequest
from plaid.model.transactions_get_request_options import TransactionsGetRequestOptions
from plaid.model.transactions_refresh_request import TransactionsRefreshRequest



@csrf_exempt
@login_required
def exchange_public_token(request):
    data = json.loads(request.body)
    public_token = data.get("public_token")

    req = ItemPublicTokenExchangeRequest(public_token=public_token)
    response = client.item_public_token_exchange(req)

    access_token = response.access_token
    #print("ACCESS TOKEN:", access_token)

    profile = request.user.profile
    profile.access_token = response.access_token
    profile.save()

    return JsonResponse({"status": "ok"})

@csrf_exempt
@login_required
def plaid_transactions_sync(request):
    access_token = request.user.profile.access_token

    req = TransactionsSyncRequest(
        access_token=access_token,
    )

    response = client.transactions_sync(req)

    return JsonResponse(response.to_dict())

@csrf_exempt
@login_required
def create_link_token(request):
    req = LinkTokenCreateRequest(
        user=LinkTokenCreateRequestUser(client_user_id="test-user"),
        client_name="SmartMoney",
        products=[Products("transactions")],
        country_codes=[CountryCode("US")],
        language="en",
        webhook="https://webhook.example.com",
        options=LinkTokenCreateRequestOptions(
            override_username="user_transactions_dynamic",
            override_password="pass"
        )
    )

    response = client.link_token_create(req)
    return JsonResponse(response.to_dict())

@login_required
def whoami(request):
    return JsonResponse({"username": request.user.username})


@csrf_exempt
@login_required
def plaid_accounts(request):
    access_token = request.user.profile.access_token

    req = AccountsGetRequest(access_token=access_token)
    response = client.accounts_get(req)

    return JsonResponse(response.to_dict())

@csrf_exempt
@login_required
def plaid_transactions_refresh(request):
    access_token = request.user.profile.access_token
    if not access_token:
        return JsonResponse({"error": "no access token"}, status=400)

    req = TransactionsRefreshRequest(access_token=access_token)
    client.transactions_refresh(req)

    return JsonResponse({"status": "refresh triggered"})

@csrf_exempt
@login_required
def plaid_transactions(request):
    access_token = request.user.profile.access_token
    if not access_token:
        return JsonResponse({"error": "no access token"}, status=400)

    start_date = (datetime.now() - timedelta(days=30)).date()
    end_date = datetime.now().date()

    all_tx = []
    offset = 0
    count = 500

    while True:
        req = TransactionsGetRequest(
            access_token=access_token,
            start_date=start_date,
            end_date=end_date,
            options=TransactionsGetRequestOptions(count=count, offset=offset),
        )
        resp = client.transactions_get(req)

        all_tx.extend(resp.transactions)

        # resp.total_transactions is the total available for that date range
        if len(all_tx) >= resp.total_transactions:
            break

        offset += count

    return JsonResponse({
        "transactions": [t.to_dict() for t in all_tx]
    })


@csrf_exempt
def register(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required"}, status=400)

    data = json.loads(request.body)

    email = data.get("email")
    username = data.get("username")
    password = data.get("password")

    if not email or not username or not password:
        return JsonResponse({"error": "Missing email, username or password"}, status=400)

    if User.objects.filter(email=email).exists():
        return JsonResponse({"error": "Email already in use"}, status=400)

    if User.objects.filter(username=username).exists():
        return JsonResponse({"error": "Username already taken"}, status=400)

    user = User.objects.create_user(email=email,username=username, password=password)
    Profile.objects.create(user=user)

    return JsonResponse({"message": "User created successfully"})

@csrf_exempt
def login_api(request):
    if request.method == "POST":
        data = json.loads(request.body)
        username = data.get("username")
        password = data.get("password")

        if not username or not password:
            return JsonResponse(
                {"error": "Username and password are required."},
                status=400
            )

        user = authenticate(request, username=username, password=password)
        if user is None:
            return JsonResponse(
                {"error": "Invalid username or password."},
                status=401
            )

        login(request, user)
        get_token(request)
        return JsonResponse({"message": "Login successful."})

    return JsonResponse(
        {"error": "POST request required."},
        status=405
    )


@csrf_exempt
@login_required
def logout_api(request):
    logout(request)
    return JsonResponse({'message': 'Logout successful.'})

@csrf_exempt
@login_required
def update_email(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required"}, status=400)

    if not request.user.is_authenticated:
        return JsonResponse({"error": "Authentication required"}, status=401)

    data = json.loads(request.body)
    new_email = data.get("email")

    if not new_email:
        return JsonResponse({"error": "New email is required"}, status=400)

    if User.objects.filter(email=new_email).exists():
        return JsonResponse({"error": "Email already in use"}, status=400)

    user = request.user
    user.email = new_email
    user.save()
    login(request, user)
    return JsonResponse({"message": "Email updated successfully"})

@csrf_exempt
@login_required
def update_username(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required"}, status=400)

    if not request.user.is_authenticated:
        return JsonResponse({"error": "Authentication required"}, status=401)

    data = json.loads(request.body)
    new_username = data.get("username")

    if not new_username:
        return JsonResponse({"error": "New username is required"}, status=400)

    if User.objects.filter(username=new_username).exists():
        return JsonResponse({"error": "Username already taken"}, status=400)

    user = request.user
    user.username = new_username
    user.save()

    login(request, user)
    print("UPDATE VIEW:", request.user, request.user.is_authenticated)

    return JsonResponse({"message": "Username updated successfully"})

@login_required
@csrf_exempt
def update_password(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required"}, status=400)

    if not request.user.is_authenticated:
        return JsonResponse({"error": "Authentication required"}, status=401)

    data = json.loads(request.body)
    new_password = data.get("password")

    if not new_password:
        return JsonResponse({"error": "New password is required"}, status=400)

    user = request.user
    user.set_password(new_password)
    user.save()
    login(request, user)

    return JsonResponse({"message": "Password updated successfully"})

def user_data(request):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Authentication required"}, status=401)

    user = request.user
    return JsonResponse({
        "email": user.email,
        "username": user.username,
    })

@csrf_exempt
@login_required
def setBudget(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required"}, status=400)

    if not request.user.is_authenticated:
        return JsonResponse({"error": "Authentication required"}, status=401)

    data = json.loads(request.body)
    category = data.get("category")
    amount = data.get("amount")
    month = data.get("month")

    if not category or not amount or not month:
        return JsonResponse({"error": "Missing category, amount or month"}, status=400)

    budget = Budget.objects.create(user=request.user, category=category, amount=amount, month=month)

    return JsonResponse({"message": "Budget set successfully"})
