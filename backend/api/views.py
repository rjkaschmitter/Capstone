from django.http import JsonResponse
from .models import Transaction
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.models import User
from .models import BankAccount, Budget, Profile
from django.contrib.auth.decorators import login_required
from datetime import datetime, timedelta
from django.middleware.csrf import get_token
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
from django.db.models import Sum
from django.db.models.functions import Coalesce
from decimal import Decimal
from datetime import datetime


def total_spent_month(user, year: int, month: int) -> Decimal:
    start, end = month_bounds(year, month)
    return (Transaction.objects
            .filter(user=user, date__gte=start, date__lt=end)
            .aggregate(total=Coalesce(Sum("amount"), Decimal("0.00")))["total"])

def spending_by_category_month(user, year: int, month: int):
    start, end = month_bounds(year, month)
    qs = (Transaction.objects
          .filter(user=user, date__gte=start, date__lt=end)
          .values("category")
          .annotate(value=Coalesce(Sum("amount"), Decimal("0.00")))
          .order_by("-value"))
    return [{"name": r["category"], "value": float(r["value"])} for r in qs]


def month_bounds(year, month):
    start = datetime(year, month, 1)
    if month == 12:
        end = datetime(year + 1, 1, 1)
    else:
        end = datetime(year, month + 1, 1)
    return start, end


def remaining_by_category_month(user, year: int, month: int):
    start, end = month_bounds(year, month)

    spent_rows = (Transaction.objects
                  .filter(user=user, date__gte=start, date__lt=end)
                  .values("category")
                  .annotate(spent=Coalesce(Sum("amount"), Decimal("0.00"))))

    spent = {r["category"]: r["spent"] for r in spent_rows}
    budgets = {b.category: b.monthly_limit for b in Budget.objects.filter(user=user)}

    cats = set(spent.keys()) | set(budgets.keys())
    rows = []
    for c in sorted(cats):
        b = budgets.get(c, Decimal("0.00"))
        s = spent.get(c, Decimal("0.00"))
        rows.append({
            "category": c,
            "budget": float(b),
            "spent": float(s),
            "remaining": float(b - s),
            "percent_used": (float(s / b * 100) if b and b != 0 else None),
        })

    rows.sort(key=lambda r: r["remaining"])
    return rows


@csrf_exempt
@login_required
def dashboard(request):
    year = int(request.GET.get("year", datetime.now().year))
    month = int(request.GET.get("month", datetime.now().month))

    return JsonResponse({
        "year": year,
        "month": month,
        "total_spent": float(total_spent_month(request.user, year, month)),
        "by_category": spending_by_category_month(request.user, year, month),
    })

@csrf_exempt
@login_required
def addManualTransaction(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required"}, status=400)

    data = json.loads(request.body)

    txn = Transaction.objects.create(
        user=request.user,
        name=data.get("name"),
        amount=data.get("amount"),
        date=data.get("date"),
        category=data.get("category"),
        source="manual"
    )
    name = data.get("name")
    amount = data.get("amount")
    date = data.get("date")
    category = data.get("category")

    return JsonResponse({"status": "ok", "id": txn.id})


@csrf_exempt
@login_required
# Exchange the public token for a access token which is used to make user-specific Plaid API calls
def exchange_public_token(request):
    data = json.loads(request.body)
    public_token = data.get("public_token")

    req = ItemPublicTokenExchangeRequest(public_token=public_token)
    response = client.item_public_token_exchange(req)

    access_token = response.access_token

    profile = request.user.profile
    profile.access_token = response.access_token
    profile.save()

    return JsonResponse({"status": "ok"})

@csrf_exempt
@login_required
# Use Plaid's transactions sync endpoint to get incremental updates to the user's transactions since the last sync
def get_transactions(request):
    txns = Transaction.objects.filter(user=request.user).order_by("-date")

    data = [
        {
            "id": t.id,
            "name": t.name,
            "amount": float(t.amount),
            "date": str(t.date),
            "category": t.category,
            "source": t.source,
        }
        for t in txns
    ]

    return JsonResponse(data, safe=False)


@csrf_exempt
@login_required
# Create a link token for the frontend to initialize Plaid Link
# Right now this auto sets the username and password for testing purposes
def create_link_token(request):
    req = LinkTokenCreateRequest(
        user=LinkTokenCreateRequestUser(client_user_id="test-user"),
        client_name="SmartMoney",
        products=[Products("transactions")],
        country_codes=[CountryCode("US")],
        language="en",
        webhook="https://webhook.example.com",
        #options=LinkTokenCreateRequestOptions(
        #    override_username="user_transactions_dynamic",
        #    override_password="pass"
        #)
    )

    response = client.link_token_create(req)
    return JsonResponse(response.to_dict())

@login_required
# Verifies that the user is authenticated and returns their username
def whoami(request):
    return JsonResponse({"username": request.user.username})


@csrf_exempt
@login_required
# Get the user's bank accounts from Plaid, used to show balance
def plaid_accounts(request):
    access_token = request.user.profile.access_token

    req = AccountsGetRequest(access_token=access_token)
    response = client.accounts_get(req)

    return JsonResponse(response.to_dict())

@csrf_exempt
@login_required
# Trigger a transactions refresh for the user's accounts in Plaid
def plaid_transactions_refresh(request):
    access_token = request.user.profile.access_token
    if not access_token:
        return JsonResponse({"error": "no access token"}, status=400)

    req = TransactionsRefreshRequest(access_token=access_token)
    client.transactions_refresh(req)

    return JsonResponse({"status": "refresh triggered"})

@csrf_exempt
@login_required
# Get the user's transactions from Plaid using the stored access token, with pagination to handle large transaction sets
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

        if len(all_tx) >= resp.total_transactions:
            break

        offset += count

    return JsonResponse({
        "transactions": [t.to_dict() for t in all_tx]
    })


@csrf_exempt
# Regiesters a new user with email, username and password and creates a profile for them. Checks for missing fields and pre-existing email or username
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
# Logs in a user with username and password, checks for missing fields and invalid credentials
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
# Logs out the current user
def logout_api(request):
    logout(request)
    return JsonResponse({'message': 'Logout successful.'})

@csrf_exempt
@login_required
# Updates the user's email, checks for missing email and pre-existing email
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
# Updates the user's username, checks for missing username and pre-existing username
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
# Updates the user's password, checks if the new password is equal to the old password
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

# Returns the user's email and username, checks if the user is authenticated
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
# Creates a new budget with the specified category, amount an month for the user, also checks for missing fields
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
