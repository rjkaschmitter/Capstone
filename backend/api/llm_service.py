import requests

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL_NAME = "llama3"

ALLOWED_CATEGORIES = {
    "Food",
    "Groceries",
    "Transportation",
    "Entertainment",
    "Bills",
    "Shopping",
    "Other",
}

def classify_transaction(name: str):
    prompt = f"""
You classify financial transactions into one category.

Allowed categories:
Food
Groceries
Transportation
Entertainment
Bills
Shopping
Other

Rules:
- Return exactly one category from the allowed list.
- Do not explain.
- Do not use punctuation.
- Do not return JSON.
- If unsure, return Other.

Examples:
Starbucks -> Food
McDonald's -> Food
Trader Joe's -> Groceries
Safeway -> Groceries
Uber -> Transportation
Netflix -> Entertainment
Verizon -> Bills
Target -> Shopping
Unknown merchant -> Other

Transaction: {name}
Category:
"""

    try:
        response = requests.post(
            OLLAMA_URL,
            json={
                "model": MODEL_NAME,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.1
                }
            },
            timeout=30
        )

        response.raise_for_status()
        raw = response.json().get("response", "").strip()

        print("RAW MODEL TEXT:", repr(raw))

        if not raw:
            return {"category": "Other"}

        first_line = raw.splitlines()[0].strip()

        cleaned = first_line.replace('"', "").replace("'", "").strip()

        if cleaned not in ALLOWED_CATEGORIES:
            for category in ALLOWED_CATEGORIES:
                if category.lower() in cleaned.lower():
                    return {"category": category}
            return {"category": "Other"}

        return {"category": cleaned}

    except Exception as e:
        print("Ollama classify_transaction error:", e)
        return {"category": "Other"}
    