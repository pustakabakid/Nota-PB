import urllib.request
import json

SUPABASE_URL = "https://thkwdclcupfxrmseewlf.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRoa3dkY2xjdXBmeHJtc2Vld2xmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYxNzEwMTQsImV4cCI6MjEwMTc0NzAxNH0.sGxUvpa-AIOBpg5EI5T-r5v0LPzVKv9mMK1u5TW1Uhw"
GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbyd3IRIUuron6NKVC_BjM34-68Ueh42kMDaM2hsDDdruhlERvyb6sr3FEYY7o9UcvlF/exec"

def fetch_supabase_table(table_name):
    headers = {"apikey": SUPABASE_ANON_KEY}
    url = f"{SUPABASE_URL}/rest/v1/{table_name}?select=*"
    try:
        req = urllib.request.Request(url, headers=headers)
        res = urllib.request.urlopen(req)
        return json.loads(res.read().decode("utf-8"))
    except Exception as e:
        print(f"Error fetching {table_name}: {e}")
        return []

def run_migration():
    print("1. Fetching data from Supabase...")
    users = fetch_supabase_table("user_accounts")
    stores = fetch_supabase_table("stores")
    catalog = fetch_supabase_table("catalog_presets")
    transactions = fetch_supabase_table("transactions")
    items = fetch_supabase_table("transaction_items")

    print(f"  - Found {len(users)} users")
    print(f"  - Found {len(stores)} store profiles")
    print(f"  - Found {len(catalog)} catalog presets")
    print(f"  - Found {len(transactions)} transactions")
    print(f"  - Found {len(items)} transaction items")

    # Map items to transactions
    items_by_trx = {}
    for it in items:
        trx_id = it.get("transaction_id")
        if trx_id:
            items_by_trx.setdefault(trx_id, []).append(it)

    for trx in transactions:
        trx["items"] = items_by_trx.get(trx["id"], [])

    store_profile = stores[0] if stores else None

    payload = {
        "users": users,
        "store_profile": store_profile,
        "catalog_presets": catalog,
        "sales_notes": transactions
    }

    print("\n2. Sending payload to Google Apps Script Web App...")
    req_data = json.dumps({
        "action": "migrateSupabaseData",
        "payload": payload
    }).encode("utf-8")

    try:
        req = urllib.request.Request(
            GAS_WEB_APP_URL,
            data=req_data,
            headers={"Content-Type": "text/plain;charset=utf-8"}
        )
        res = urllib.request.urlopen(req)
        response_text = res.read().decode("utf-8")
        result = json.loads(response_text)
        print("\n--- MIGRATION RESULT ---")
        print(json.dumps(result, indent=2))
    except Exception as e:
        print(f"\nMigration HTTP call error: {e}")

if __name__ == "__main__":
    run_migration()
