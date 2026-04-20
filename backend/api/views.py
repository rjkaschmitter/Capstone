from django.http import JsonResponse
from django.db import transaction
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.models import User
from .models import Budget, Profile, Transaction, BankAccount
from django.contrib.auth.decorators import login_required
from datetime import datetime, timedelta, date
from django.middleware.csrf import get_token
import json
from django.contrib.auth import authenticate, login, logout
from .llm_service import classify_transaction
from .plaid_client import client

import time
from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser

from plaid.model.sandbox_item_fire_webhook_request import SandboxItemFireWebhookRequest
from plaid.model.webhook_type import WebhookType
from plaid.model.item_public_token_exchange_request import ItemPublicTokenExchangeRequest
from plaid.model.accounts_get_request import AccountsGetRequest
from plaid.model.products import Products
from plaid.model.country_code import CountryCode

from plaid.model.transactions_sync_request import TransactionsSyncRequest
from plaid.model.transactions_get_request import TransactionsGetRequest
from plaid.model.transactions_get_request_options import TransactionsGetRequestOptions
from plaid.model.transactions_refresh_request import TransactionsRefreshRequest
from django.db.models import Sum
from django.db.models.functions import Coalesce
from decimal import Decimal
from django.core.mail import send_mail
from django.conf import settings

BUDGET_THRESHOLD = Decimal("0.75")

@csrf_exempt
@login_required
def delete_all_budgets_and_transactions(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required"}, status=405)
    
    data = json.loads(request.body)
    if data.get("confirm") is not True:
        return JsonResponse({"error": "Confirmation required"}, status=400)

    with transaction.atomic():
        tx_deleted, _ = Transaction.objects.filter(user=request.user).delete()
        budgets_deleted, _ = Budget.objects.filter(user=request.user).delete()

        return JsonResponse({"status": "ok", "transactions_deleted": tx_deleted, "budgets_deleted": budgets_deleted})
    
def check_budget_thresholds(user, category, txn_date):
    month_start = txn_date.replace(day=1)
    budget = Budget.objects.filter(user=user, category=category, month=month_start).first()
    if not budget:
        return
    limit_amt = budget.monthly_limit
    if not limit_amt or limit_amt <= 0:
        return
    
    start, end = month_bounds(txn_date.year, txn_date.month)
    spent = (Transaction.objects.filter(user=user, category=category, date__gte=start, date__lt=end).aggregate(total=Coalesce(Sum("amount"), Decimal("0.00")))["total"])
    percent_spent = spent / limit_amt
    if percent_spent >= BUDGET_THRESHOLD and not budget.sent_email:
        if user.email:
            send_email(
                subject=f"Budget alert for {category}",
                message=f"You have spent {percent_spent:.0%} of your budget for {category} this month.",
                recipient_list=[user.email]
            ),
            
            budget.sent_email = True
            budget.save(update_fields=["sent_email"])
            

def send_email(subject, message, recipient_list):
    send_mail(
        subject,
        message,
        settings.EMAIL_HOST_USER,
        recipient_list,
        fail_silently=False,
    )

def get_budgets(request):
    month = date.today().replace(day=1)
    qs = Budget.objects.filter(user=request.user, month=month).values(
        "id", "category", "monthly_limit", "month"
    )
    return JsonResponse(list(qs), safe=False)


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
    budgets = {b.category: b.monthly_limit for b in Budget.objects.filter(user=user, month=date(year, month, 1))}

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
        "remaining_by_category": remaining_by_category_month(request.user, year, month),
    })

@csrf_exempt
@login_required
def addManualTransaction(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required"}, status=400)

    data = json.loads(request.body)
    raw_date = data.get("date")
    
    level_choice = int(data.get("level", 1)) 

    try:
        txn_date = datetime.strptime(raw_date, "%Y-%m-%d").date()
    except (ValueError, TypeError):
        return JsonResponse({"error": "Invalid date format"}, status=400)
    
    name = data.get("name")
    amount = data.get("amount")
    
    if not name or amount is None:
        return JsonResponse({"error": "Missing name or amount"}, status=400)
    
    try:
        llm_result = classify_transaction(name, level=level_choice)
        category = llm_result.get("category", "Other")
    except Exception as e:
        print("LLM classification failed:", e)
        category = "Other"

    txn = Transaction.objects.create(
        user=request.user,
        name=name,
        amount=amount,
        date=txn_date,
        category=category,
        source="manual"
    )
    
    check_budget_thresholds(request.user, txn.category, txn.date)

    return JsonResponse({"status": "ok", "id": txn.id, "category": category})


@csrf_exempt
@login_required
# Exchange the public token for a access token which is used to make user-specific Plaid API calls
def exchange_public_token(request):
    data = json.loads(request.body)
    public_token = data.get("public_token")

    req = ItemPublicTokenExchangeRequest(public_token=public_token)
    response = client.item_public_token_exchange(req)

    profile = request.user.profile
    profile.access_token = response.access_token
    profile.plaid_item_id = response.item_id
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
def trigger_sandbox_spending(request):
    data = json.loads(request.body)
    new_level = data.get("level", 1)

    profile = request.user.profile
    profile.llm_level = new_level
    profile.save()
    access_token = request.user.profile.access_token

    req = SandboxItemFireWebhookRequest(
        access_token=access_token,
        webhook_type=WebhookType('TRANSACTIONS'),
        webhook_code='DEFAULT_UPDATE'
    )
    client.sandbox_item_fire_webhook(req)
    return JsonResponse({"status": "sandbox webhook triggered"})

@csrf_exempt
@login_required
# Create a link token for the frontend to initialize Plaid Link
# Right now this auto sets the username and password for testing purposes
def create_link_token(request):
    req = LinkTokenCreateRequest(
        user=LinkTokenCreateRequestUser(client_user_id=str(request.user.id)),
        client_name="SmartMoney",
        products=[Products("transactions")],
        country_codes=[CountryCode("US")],
        language="en",
        webhook="https://tinsel-proposal-immortal.ngrok-free.dev/api/plaid_webhook/",
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

def sync_plaid_transactions_for_user(user):
    budget_categories = list(
        Budget.objects.filter(user=user).values_list("category", flat=True)
    )
    access_token = user.profile.access_token
    sync_args = {"access_token": access_token}
    if user.profile.plaid_cursor:
        sync_args["cursor"] = user.profile.plaid_cursor
    req = TransactionsSyncRequest(**sync_args)

    user_level = getattr(user.profile, "llm_level", 1)
    try:
        response = client.transactions_sync(req)
        new_transactions = sorted(response.added, key=lambda x: x.date)
        user.profile.transactions_cursor = response.next_cursor
        user.profile.save()

        today = date.today()
        for t in new_transactions[:20]:
            try:
                
                llm_result = classify_transaction(t.name, level=user_level)
                smart_category = llm_result.get("category", "Other")
            
                if smart_category in budget_categories:
                    if t.date.month == today.month and t.date.year == today.year:
                        save_date = t.date
                    else:  
                        save_date = today

                    Transaction.objects.update_or_create(
                        transaction_id=t.transaction_id,
                        defaults={
                            "user": user,
                            "name": t.name,
                            "amount": Decimal(str(t.amount)),
                            "date": save_date,
                            "category": smart_category,
                            "source": "plaid",
                        }
                    )
                    print(f"Added transaction {t.name} with category {smart_category} and amount {t.amount}")
                else:
                    print(f"Skipped {t.name}, category {smart_category} not in user's budgets")
                time.sleep(3)
            
            except Exception as e:
                print(f"Error on {t.name}: {e}, {t.category}, {t.amount}")

        
    except Exception as e:
        print(f"Error syncing transactions for user {user.username}: {e}")

@csrf_exempt
def plaid_webhook(request):
    data = json.loads(request.body)
    webhook_code = data.get("webhook_code")

    if webhook_code == 'DEFAULT_UPDATE' or webhook_code == "SYNC_UPDATES_AVAILABLE":
        item_id = data.get("item_id")
        profile = Profile.objects.filter(plaid_item_id=item_id).first()

        if profile:
            sync_plaid_transactions_for_user(profile.user)
    
    return JsonResponse({"status": "received"})

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

# Creates a new budget with the specified category, amount an month for the user, also checks for missing fields
@csrf_exempt
@login_required
def setBudget(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required"}, status=400)

    data = json.loads(request.body)
    category = data.get("category")
    month = data.get("month")
    monthly_limit = data.get("amount")
    if not category or not month or monthly_limit is None:
        return JsonResponse({"error": "Missing category, month or amount"}, status=400)

    month = date.today().replace(day=1)
    Budget.objects.update_or_create(
        user=request.user,
        category=category,
        month=month,
        defaults={"monthly_limit": monthly_limit}
    )
    return JsonResponse({"message": "Budget set successfully"})
