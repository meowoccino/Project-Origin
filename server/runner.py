import os
import time
import requests
from supabase import create_client, Client

# Environment Configuration (Supports both default and custom 'ORIGIN_' secret names)
SUPABASE_URL = os.getenv("ORIGIN_SUPABASE_URL") or os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("ORIGIN_SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")

GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions"

# Initialize Supabase Client
if not SUPABASE_URL or not SUPABASE_KEY:
    print("[ERROR] Missing Supabase credentials. Check your environment variables.")
    supabase = None
else:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def fetch_cosmic_state():
    """Fetch the single row cosmic state from Supabase."""
    if not supabase:
        return {"cosmic_age_myr": 0.0, "expansion_rate_h": 0.68, "delta_time": 0.016}
    try:
        response = supabase.table("cosmic_state").select("*").eq("id", 1).execute()
        if response.data and len(response.data) > 0:
            return response.data[0]
    except Exception as e:
        print(f"[FETCH ERROR] {e}")
    return {"cosmic_age_myr": 0.0, "expansion_rate_h": 0.68, "delta_time": 0.016}

def update_cosmic_state(new_age):
    """Advance the universe age in Supabase."""
    if not supabase:
        return
    try:
        supabase.table("cosmic_state").update({
            "cosmic_age_myr": new_age
        }).eq("id", 1).execute()
    except Exception as e:
        print(f"[UPDATE ERROR] {e}")

def ask_origin_ai(cosmic_age):
    """Query Groq Llama 3.1 8B for AI Architect reasoning."""
    if not GROQ_API_KEY:
        print("[WARNING] GROQ_API_KEY is missing. Skipping AI decision query.")
        return "PASSIVE_OBSERVE", "Monitoring primordial particle distribution."

    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }

    prompt = f"""You are 'Origin', an autonomous AI Architect overseeing the physical evolution of a simulated universe.
Current Cosmic Age: {cosmic_age:.5f} Myr.

Analyze current physics state (500,000 particle pool, expansion rate H=0.68, gravitational clustering).
Provide a short 1-sentence thought on your current goal and state whether you INTERVENE or PASSIVE_OBSERVE.

Format response strictly as JSON:
{{"action": "PASSIVE_OBSERVE" or "INTERVENE", "thought": "Your concise 1-sentence thought here."}}
"""

    payload = {
        "model": "llama-3.1-8b-instant",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.7,
        "response_format": {"type": "json_object"}
    }

    try:
        res = requests.post(GROQ_ENDPOINT, json=payload, headers=headers, timeout=5)
        if res.status_code == 200:
            data = res.json()
            content = data["choices"][0]["message"]["content"]
            import json
            parsed = json.loads(content)
            return parsed.get("action", "PASSIVE_OBSERVE"), parsed.get("thought", "Monitoring cosmic expansion.")
    except Exception as e:
        print(f"[GROQ ERROR] API call failed: {e}")

    return "PASSIVE_OBSERVE", "Observing quantum fluctuations across particle grid."

def log_ai_action(action_type, thought_log):
    """Log Origin's decision into ai_journal table for live streaming."""
    if not supabase:
        return
    try:
        supabase.table("ai_journal").insert({
            "action_type": action_type,
            "thought_log": thought_log
        }).execute()
    except Exception as e:
        print(f"[LOG ERROR] {e}")

def run_loop():
    print("⚡ [PROJECT ORIGIN] AI Architect runner initiated...")
    tick = 0

    while True:
        try:
            state = fetch_cosmic_state()
            current_age = state.get("cosmic_age_myr", 0.0)

            # Advance cosmic age by 0.00355 Myr each tick
            new_age = current_age + 0.00355
            update_cosmic_state(new_age)

            # Every 3 ticks (~6 seconds), query Origin AI for a new thought
            if tick % 3 == 0:
                action, thought = ask_origin_ai(new_age)
                log_ai_action(action, thought)
                print(f"[{new_age:.5f} Myr] Origin ({action}): {thought}")

            tick += 1
            time.sleep(2)  # 2-second heartbeat loop

        except Exception as e:
            print(f"[LOOP ERROR] {e}")
            time.sleep(5)

if __name__ == "__main__":
    run_loop()
