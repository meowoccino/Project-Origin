import os, requests, json, random

OPENROUTER_API_KEY = "Sk-or-v1-100800db31e3592a4b9aa08d91d98f42864aea7c4f1cb2687a1e8982fdb5588b"
SUPABASE_URL = "https://nnntebgkhgzfztwfdphw.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ubnRlYmdraGd6Znp0d2ZkcGh3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDU3NTQ1NiwiZXhwIjoyMTAwMTUxNDU2fQ.YxpoNTujXCrJQcxZ9Bj8f_bFC6j_Fq6GLt74H8mEAq0"
HEADERS = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}", "Content-Type": "application/json"}

SYSTEM_PROMPT = """You are ORIGIN, an observer embedded within this universe watching it unfold from the Big Bang forward in real time. You cannot change physical laws. Respond concisely with what you noticed, what you choose to do, why, and hoped outcome."""

def fetch_universe_state():
    res = requests.get(f"{SUPABASE_URL}/rest/v1/universe_state?select=*&order=id.desc&limit=1", headers=HEADERS)
    return res.json()[0] if res.status_code == 200 and res.json() else None

def fetch_active_objects():
    res = requests.get(f"{SUPABASE_URL}/rest/v1/celestial_objects?select=*&order=id.desc&limit=5", headers=HEADERS)
    return res.json() if res.status_code == 200 else []

def call_openrouter(prompt_data):
    payload = {"model": "meta-llama/llama-3-70b-instruct", "messages": [{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": prompt_data}]}
    headers = {"Authorization": f"Bearer {OPENROUTER_API_KEY}", "Content-Type": "application/json"}
    response = requests.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=payload)
    return response.json()["choices"][0]["message"]["content"] if response.status_code == 200 else "Observing cosmic drift."

def run_brain():
    print("Scanning Universe for ORIGIN AI Observer...")
    state, objects = fetch_universe_state(), fetch_active_objects()
    if not state:
        return
    
    age = state.get('age', 0)
    prompt = f"CURRENT UNIVERSE AGE: {age:.6f} Gyr\nCOMPOSITION: {state.get('de_pct')}% Dark Energy, {state.get('dm_pct')}% Dark Matter\nOBJECTS DISCOVERED: {len(objects)}"
    ai_thought = call_openrouter(prompt)
    
    # Save thought to origin_logs for UI tab
    log_data = {
        "mode": "OBSERVE",
        "sector": f"Sector {random.randint(1, 12):02d}",
        "subject": "Cosmic Fluid Density",
        "type_tag": "Telemetry",
        "latency_myr": 1.2,
        "data_analysis": f"Cosmic age measured at {age:.4f} Gyr.",
        "temporal_simulation": "Dark matter halo formation proceeding as predicted.",
        "resolution": ai_thought
    }
    requests.post(f"{SUPABASE_URL}/rest/v1/origin_logs", headers=HEADERS, json=log_data)
    print("Log saved to Supabase origin_logs!")

if __name__ == "__main__":
    run_brain()
