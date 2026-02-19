import os
from plaid.api import plaid_api
from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
from plaid.model.products import Products
from plaid import Configuration, ApiClient

configuration = Configuration(
    host="https://sandbox.plaid.com",
    api_key={
        "clientId": os.getenv("PLAID_CLIENT_ID"),
        "secret": os.getenv("PLAID_SECRET"),
    }
)
print("CLIENT ID:", os.getenv("PLAID_CLIENT_ID"))
print("SECRET:", os.getenv("PLAID_SECRET"))

api_client = ApiClient(configuration)
client = plaid_api.PlaidApi(api_client)
