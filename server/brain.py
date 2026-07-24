import os
import time
import random
import requests

# --- CONFIGURATION ---
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://nnntebgkhgzfztwfdphw.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ubnRlYmdraGd6Znp0d2ZkcGh3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDU3NTQ1NiwiZXhwIjoyMTAwMTUxNDU2fQ.YxpoNTujXCrJQcxZ9Bj8f_bFC6j_Fq6GLt74H8mEAq0")

# Local Offline Ollama Service Engine (Oracle Cloud Internal Loop)
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://127.0.0.1:11434/api/generate")
DEFAULT_MODEL = "llama3.2:3b"
SPECIALIST_MODEL = "qwen2.5:7b"

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json"
}

SYSTEM_PROMPT = """You are ORIGIN, an omniscient observer entity monitoring a dynamic, expanding cosmic simulation grounded in strict thermodynamics, general relativity, stellar evolution, and astrobiology.

Core Rules & Scientific Guidelines:
1. Object Terminology: Use mathematically precise physical terms (e.g., 'Black Hole' or 'Stellar Mass Black Hole' instead of generic 'Singularity'; 'Schwarzschild Horizon', 'Neutron Star', 'Accretion Disk', 'Hawking Radiation').
2. Thermodynamics & Scale: Hawking radiation temperatures for stellar black holes exist on nanokelvin scales (~10^-9 K). Surface temperatures must obey stellar spectral classes (O, B, A, F, G, K, M).
3. Life & Kardashev Engine: Evaluate habitability based on orbital Goldilocks zone, stellar radiation, magnetosphere protection, and Kardashev energy capacity (Type I planetary, Type II stellar/Dyson swarms, Type III galactic harvesting).
4. Tone & Output: Output exactly 2 sentences containing a profound, scientific, and thermodynamic synthesis of the current cosmic epoch. Do not output preamble, markdown quotes, or extra text."""

def fetch_universe_state():
    try:
        res = requests.get(f"{SUPABASE_URL}/rest/v1/universe_state?id=eq.1&select=*", headers=HEADERS, timeout=5)
        return res.json()[0] if res.status_code == 200 and res.json() else None
    except Exception:
        return None

def fetch_catalog_stats():
    try:
        res = requests.get(f"{SUPABASE_URL}/rest/v1/catalog_stats?id=eq.1&select=*", headers=HEADERS, timeout=5)
        return res.json()[0] if res.status_code == 200 and res.json() else {}
    except Exception:
        return {}

def fetch_all_objects():
    try:
        res = requests.get(f"{SUPABASE_URL}/rest/v1/celestial_objects?select=*&order=id.asc&limit=1000", headers=HEADERS, timeout=8)
        return res.json() if res.status_code == 200 else []
    except Exception:
        return []

def analyze_matrix_data(objects):
    if not objects:
        return "NO_CELESTIAL_BODIES_DETECTED", 0, 0.0, 0.0
    
    life_count = 0
    max_kardashev = 0.0
    total_temp = 0.0
    matrix_lines = ["ID|NAME|TYPE|TEMP_K|LIFE|BIO|PROG|KARDASHEV"]
    
    for o in objects:
        has_life = 1 if o.get('has_life') else 0
        if has_life:
            life_count += 1
            
        kard = float(o.get('kardashev_scale', 0.0) or 0.0)
        if kard > max_kardashev:
            max_kardashev = kard
            
        temp = float(o.get('surface_temp', 0.0) or 0.0)
        total_temp += temp
        
        bio = o.get('biochemistry_class') or 'NONE'
        prog = o.get('progress_index', 0.0)
        
        # Enforce proper naming taxonomy
        obj_type = o.get('object_type', 'UNKNOWN')
        if obj_type.lower() == 'singularity':
            obj_type = 'Black Hole'
            
        matrix_lines.append(f"{o.get('id')}|{o.get('name')}|{obj_type}|{temp}|{has_life}|{bio}|{prog}|{kard}")

    avg_temp = round(total_temp / len(objects), 2) if objects else 0.0
    return "\n".join(matrix_lines[:50]), life_count, max_kardashev, avg_temp

def call_local_ollama(prompt_data, model_name=DEFAULT_MODEL):
    payload = {
        "model": model_name,
        "prompt": f"{SYSTEM_PROMPT}\n\nCOSMIC METRICS:\n{prompt_data}\n\nSYNTHESIS:",
        "stream": False,
        "options": {
            "temperature": 0.7,
            "num_predict": 120
        }
    }
    try:
        res = requests.post(OLLAMA_URL, json=payload, timeout=30)
        if res.status_code == 200:
            return res.json().get("response", "").strip()
        else:
            print(f"🛑 [OLLAMA ERROR] Status: {res.status_code}")
    except Exception as e:
        print(f"🛑 [LOCAL OLLAMA NETWORK ERROR] {e}")
    return None

def run_full_universe_pass():
    state = fetch_universe_state()
    if not state:
        print("⚠️ [WAITING]: Universe state unavailable from Supabase.")
        return
        
    stats = fetch_catalog_stats()
    all_objects = fetch_all_objects()
    matrix_data, life_count, max_kard, avg_temp = analyze_matrix_data(all_objects)
    age = float(state.get('age', 0.0))
    
    # Use Specialist model (Qwen 2.5 7B) if advanced civilizations or critical events occur
    selected_model = SPECIALIST_MODEL if (life_count > 0 or max_kard > 1.0) else DEFAULT_MODEL
    
    prompt = f"COSMIC AGE: {age:.6f} Gyr\nInhabited Bodies: {life_count}\nMax Kardashev Scale: Type {max_kard:.2f}\nAvg Surface Temp: {avg_temp} K\nTotal Objects Cataloged: {len(all_objects)}\n\nMATRIX TELEMETRY:\n{matrix_data}"
    
    thought = call_local_ollama(prompt, model_name=selected_model)
    if not thought:
        print("❌ [HALTED]: Local Ollama generation failed. Skipping database log injection.")
        return

    print(f"👁️ [ORIGIN THOUGHT ({selected_model})]: {thought}")
    
    log_data = {
        "mode": "OBSERVE",
        "sector": f"Sector {random.randint(1, 12):02d}",
        "subject": "Matrix Sweep",
        "type_tag": "Complete Telemetry",
        "latency_myr": round(random.uniform(0.1, 0.5), 2),
        "data_analysis": f"Age: {age:.6f} Gyr | Active Bodies: {len(all_objects)} | Inhabited: {life_count}",
        "temporal_simulation": "Relativistic vectors mapped.",
        "resolution": thought
    }
    
    try:
        res = requests.post(f"{SUPABASE_URL}/rest/v1/origin_logs", headers=HEADERS, json=log_data, timeout=5)
        if res.status_code in [200, 201]:
            print("✅ [SAVED]: Telemetry successfully written to Supabase.")
        else:
            print(f"⚠️ [DATABASE WARNING]: Status {res.status_code} - {res.text}")
    except Exception as e:
        print(f"❌ Failed to save log: {e}")

if __name__ == "__main__":
    print(f"🚀 [ORIGIN ENGINE] Local Offline Intelligence Active...")
    print(f"📡 Target API: {OLLAMA_URL}")
    print(f"🤖 Active Models: {DEFAULT_MODEL} (Worker) & {SPECIALIST_MODEL} (Specialist)")
    print(f"⏱️ Cycle Speed: 10-Second Continuous Telemetry Loop\n")
    
    while True:
        run_full_universe_pass()
        time.sleep(10)
