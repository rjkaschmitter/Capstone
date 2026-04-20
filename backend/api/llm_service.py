import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()
client = Groq(api_key=os.getenv("GROQ_KEY"))

GRANULARITY_MAP = {
    1: ["Food", "Entertainment", "Transportation", "Bills", "Shopping", "Other"],
    2: ["Dining", "Groceries", "Transportation", "Housing", "Entertainment", "Shopping", "Health", "Other"],
    3: ["Groceries", "Shopping","Dining", "Fuel", "Rent", "Health", "Streaming", "Utilities", "Subscription", "Ride Share", "Airlines", "Other"],
    4: ["Groceries", "Shopping", "Fast Food", "Dine In", "Drinks", "Fuel", "Rent", "Health", "Streaming", "Utilities", "Subscription", "Ride Share", "Airlines", "Other" ]
}

def classify_transaction(name, level=2):
    categories = GRANULARITY_MAP.get(level, GRANULARITY_MAP[2])
    
    system_prompt = (
        f"You are a financial assistant. Categorize the merchant into EXACTLY ONE "
        f"of these categories: {categories}. Return only the category name."
    )

    try:
        completion = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": name}
            ],
            temperature=0, 
            max_tokens=20
        )
        category = completion.choices[0].message.content.strip()
        
        if category not in categories:
            category = "Other"
            
        return {"category": category}
    except Exception as e:
        print(f"LLM Error: {e}")
        return {"category": "Other"}