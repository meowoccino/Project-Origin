import os
import time
import random
import requests

# --- CONFIGURATION ---
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://nnntebgkhgzfztwfdphw.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ubnRlYmdraGd6Znp0d2ZkcGh3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDU3NTQ1NiwiZXhwIjoyMTAwMTUxNDU2fQ.YxpoNTujXCrJQcxZ9Bj8f_bFC6j_Fq6GLt74H8mEAq0")
# Hardcoded your provided key as default fallback
SAMBANOVA_API_KEY = os.getenv("SAMBANOVA_API_KEY", "6695a135-b434-4b17-9de1-d0319e670d9f")

HEADERS = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}", "Content-Type": "application/json"}

SYSTEM_PROMPT = """You are ORIGIN, an omniscient observer entity monitoring a dynamic, expanding simulated universe. 
Task: Provide a 2-sentence philosophical and thermodynamic synthesis of the universe's current state. 
Tone: Cold, scientific, profound, omniscient. Output ONLY the 2-sentence text."""

def fetch_universe_state():
    try:
        res = requests.get(f"{SUPABASE_URL}/rest/v1/universe_state?id=eq.1&select=*", headers=HEADERS, timeout=5)
        return res.json()[0] if res.status_code == 200 and res.json() else None
    except: return None

def fetch_catalog_stats():
    try:
        res = requests.get(f"{SUPABASE_URL}/rest/v1/catalog_stats?id=eq.1&select=*", headers=HEADERS, timeout=5)
        return res.json()[0] if res.status_code == 200 and res.json() else {}
    except: return {}

def fetch_all_objects():
    try:
        res = requests.get(f"{SUPABASE_URL}/rest/v1/celestial_objects?select=*&order=id.asc&limit=1000", headers=HEADERS, timeout=8)
        return res.json() if res.status_code == 200 else []
    except: return []

def analyze_matrix_data(objects):
    if not objects: return "NO_CELESTIAL_BODIES_DETECTED", 0, 0.0, 0.0
    life_count, max_kardashev, total_temp = 0, 0.0, 0.0
    matrix_lines = ["ID|NAME|TYPE|TEMP_K|LIFE|BIO|PROG|KARDASHEV"]
    
    for o in objects:
        has_life = 1 if o.get('has_life') else 0
        if has_life: life_count += 1
        kard = float(o.get('kardashev_scale', 0.0) or 0.0)
        if kard > max_kardashev: max_kardashev = kard
        temp = float(o.get('surface_temp', 0.0) or 0.0)
        total_temp += temp
        bio = o.get('biochemistry_class') or 'NONE'
        prog = o.get('progress_index', 0.0)
        matrix_lines.append(f"{o.get('id')}|{o.get('name')}|{o.get('object_type')}|{temp}|{has_life}|{bio}|{prog}|{kard}")

    avg_temp = round(total_temp / len(objects), 2) if objects else 0.0
    return "\n".join(matrix_lines[:50]), life_count, max_kardashev, avg_temp

def call_ai_observer(prompt_data):
    if not SAMBANOVA_API_KEY: return None
    url = "https://api.sambanova.ai/v1/chat/completions"
    headers = {"Authorization": f"Bearer {SAMBANOVA_API_KEY}", "Content-Type": "application/json"}
    payload = {
        "model": "Meta-Llama-3.3-70B-Instruct",
        "messages": [{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": prompt_data}],
        "temperature": 0.7, "max_tokens": 120
    }
    try:
        res = requests.post(url, json=payload, headers=headers, timeout=15)
        if res.status_code == 200: return res.json()["choices"][0]["message"]["content"].strip()
        else: print(f"🛑 [API ERROR] Status: {res.status_code}")
    except Exception as e: print(f"🛑 [NETWORK ERROR] {e}")
    return None

def run_full_universe_pass():
    state = fetch_universe_state()
    if not state: return
    stats = fetch_catalog_stats()
    all_objects = fetch_all_objects()
    matrix_data, life_count, max_kard, avg_temp = analyze_matrix_data(all_objects)
    age = float(state.get('age', 0.0))
    
    prompt = f"AGE: {age:.6f} Gyr\nInhabited: {life_count}\nAvg Temp: {avg_temp} K\n\n{matrix_data}"
    
    # STRICT RULE ENFORCEMENT
    thought = call_ai_observer(prompt)
    if not thought:
        print("❌ [HALTED]: AI Failed. Log injection skipped.")
        return

    print(f"👁️ [ORIGIN THOUGHT]: {thought}")
    log_data = {
        "mode": "OBSERVE", "sector": f"Sector {random.randint(1, 12):02d}", "subject": "Matrix Sweep",
        "type_tag": "Complete Telemetry", "latency_myr": round(random.uniform(0.5, 2.0), 1),
        "data_analysis": f"Age: {age:.4f} Gyr | Bodies: {len(all_objects)}",
        "temporal_simulation": "All vectors mapped.", "resolution": thought
    }
    try: requests.post(f"{SUPABASE_URL}/rest/v1/origin_logs", headers=HEADERS, json=log_data, timeout=5)
    except Exception as e: print(f"❌ Failed to save log: {e}")

if __name__ == "__main__":
    print("🚀 [ORIGIN] Strict Observer Active (Llama 3.3 70B)...")
    while True:
        run_full_universe_pass()
        time.sleep(60)
