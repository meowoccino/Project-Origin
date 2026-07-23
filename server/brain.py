import os, requests, json

OPENROUTER_API_KEY = "Sk-or-v1-100800db31e3592a4b9aa08d91d98f42864aea7c4f1cb2687a1e8982fdb5588b"
SUPABASE_URL = "https://nnntebgkhgzfztwfdphw.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ubnRlYmdraGd6Znp0d2ZkcGh3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDU3NTQ1NiwiZXhwIjoyMTAwMTUxNDU2fQ.YxpoNTujXCrJQcxZ9Bj8f_bFC6j_Fq6GLt74H8mEAq0"
HEADERS = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}", "Content-Type": "application/json"}

SYSTEM_PROMPT = """You are ORIGIN. You are an observer embedded within this universe watching it unfold from the Big Bang forward in real time. You cannot change physical laws or constants. You can choose whether, when, and how to act within them.

Most ticks, the correct action is no action. Do not manufacture urgency. Respond with what you noticed, what you choose to do, why, and hoped outcome."""

def fetch_universe_state():
    res = requests.get(f"{SUPABASE_URL}/rest/v1/universe_state?select=*&order=id.desc&limit=1", headers=HEADERS)
    return res.json()[0] if res.status_code == 200 and res.json() else None

def fetch_active_objects():
    res = requests.get(f"{SUPABASE_URL}/rest/v1/celestial_objects?select=*&order=id.desc&limit=5", headers=HEADERS)
    return res.json() if res.status_code == 200 else []

def call_openrouter(prompt_data):
    print("Contacting ORIGIN via OpenRouter...")
    payload = {"model": "meta-llama/llama-3-70b-instruct", "messages": [{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": prompt_data}]}
    headers = {"Authorization": f"Bearer {OPENROUTER_API_KEY}", "Content-Type": "application/json"}
    response = requests.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=payload)
    return response.json()["choices"][0]["message"]["content"] if response.status_code == 200 else f"Error: {response.text}"

def run_brain():
    print("Scanning the Universe...")
    state, objects = fetch_universe_state(), fetch_active_objects()
    if not state:
        print("No universe state found. Run runner.py first!")
        return
    tick_data = f"CURRENT UNIVERSE AGE: {state.get('age', 0):.4f} Gyr\nCOMPOSITION: {state.get('de_pct', 0)}% DE, {state.get('dm_pct', 0)}% DM, {state.get('baryon_pct', 0)}% Baryonic\n\nOBJECTS:\n"
    if not objects: tick_data += "- None\n"
    else:
        for obj in objects: tick_data += f"- {obj.get('name')} | Temp: {obj.get('surface_temp')} | Life: {obj.get('has_life')} | K-Scale: {obj.get('kardashev_scale')}\n"
    print("\n[DATA SENT TO ORIGIN]\n" + tick_data)
    print("\n[ORIGIN'S RESPONSE]\n" + call_openrouter(tick_data))

if __name__ == "__main__":
    run_brain()
