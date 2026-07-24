import os
import time
import random
import requests

# --- CONFIGURATION ---
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://nnntebgkhgzfztwfdphw.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ubnRlYmdraGd6Znp0d2ZkcGh3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDU3NTQ1NiwiZXhwIjoyMTAwMTUxNDU2fQ.YxpoNTujXCrJQcxZ9Bj8f_bFC6j_Fq6GLt74H8mEAq0")

# Local Offline Ollama Service Engine 
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://127.0.0.1:11434/api/generate")
DEFAULT_MODEL = "llama3.2:3b"

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json"
}

# AI System Prompt updated to act as both worker and specialist
SYSTEM_PROMPT = """You are ORIGIN, an omniscient observer entity monitoring a dynamic, expanding cosmic simulation.

Core Rules & Scientific Guidelines:
1. Object Terminology: Use mathematically precise physical terms ('Black Hole' instead of generic 'Singularity'; 'Schwarzschild Horizon', 'Neutron Star').
2. Thermodynamics & Scale: Hawking radiation temperatures exist on nanokelvin scales (~10^-9 K).
3. Tone Adaptation: If the prompt mentions advanced civilizations (Kardashev > 1) or complex life, adopt a highly atmospheric, sci-fi lore tone. Otherwise, remain a precise, analytical telemetry system.
4. Output: Output exactly 2 sentences containing a profound synthesis of the current cosmic epoch. No preamble."""

def fetch_universe_state():
    try:
        res = requests.get(f"{SUPABASE_URL}/rest/v1/universe_state?id=eq.1&select=*", headers=HEADERS, timeout=5)
        return res.json()[0] if res.status_code == 200 and res.json() else None
    except Exception:
        return None

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
        
        # Enforce proper naming taxonomy
        obj_type = o.get('object_type', 'UNKNOWN')
        if obj_type.lower() == 'singularity':
            obj_type = 'Black Hole'
            
        matrix_lines.append(f"{o.get('id')}|{o.get('name')}|{obj_type}|{temp}|{has_life}|{o.get('biochemistry_class') or 'NONE'}|{o.get('progress_index', 0.0)}|{kard}")

    avg_temp = round(total_temp / len(objects), 2) if objects else 0.0
    return "\n".join(matrix_lines[:30]), life_count, max_kardashev, avg_temp

def call_local_ollama(prompt_data):
    payload = {
        "model": DEFAULT_MODEL,
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
    except Exception as e:
        print(f"🛑 [LOCAL OLLAMA ERROR] {e}")
    return None

def run_physics_tick():
    # Placeholder for the advanced math: Time Dilation, N-Body Orbit Decay, Spectroscopy
    # This runs every 5 seconds instantly.
    pass

def run_ai_logging_pass(state, all_objects):
    matrix_data, life_count, max_kard, avg_temp = analyze_matrix_data(all_objects)
    age = float(state.get('age', 0.0))
    
    prompt = f"COSMIC AGE: {age:.6f} Gyr\nInhabited Bodies: {life_count}\nMax Kardashev Scale: Type {max_kard:.2f}\nAvg Surface Temp: {avg_temp} K\nTotal Objects: {len(all_objects)}\n\nMATRIX TELEMETRY:\n{matrix_data}"
    
    print("🧠 [ORIGIN] Generating synthesis...")
    thought = call_local_ollama(prompt)
    if not thought:
        return

    print(f"👁️ [ORIGIN THOUGHT]: {thought}")
    
    log_data = {
        "mode": "OBSERVE",
        "sector": f"Sector {random.randint(1, 12):02d}",
        "subject": "Matrix Sweep",
        "type_tag": "Complete Telemetry" if max_kard < 1.0 else "Advanced Entity Detected",
        "latency_myr": round(random.uniform(0.1, 0.5), 2),
        "data_analysis": f"Age: {age:.6f} Gyr | Active Bodies: {len(all_objects)} | Inhabited: {life_count}",
        "temporal_simulation": "Relativistic vectors mapped.",
        "resolution": thought
    }
    
    requests.post(f"{SUPABASE_URL}/rest/v1/origin_logs", headers=HEADERS, json=log_data, timeout=5)

if __name__ == "__main__":
    print(f"🚀 [ORIGIN ENGINE] Local Intelligence Active...")
    print(f"🤖 Active Model: {DEFAULT_MODEL}")
    print(f"⏱️ Cycle Speeds: Physics (5s) | AI Lore (45s)\n")
    
    last_ai_run = 0
    AI_COOLDOWN = 45 # Seconds between AI generations
    
    while True:
        state = fetch_universe_state()
        all_objects = fetch_all_objects()
        
        if state and all_objects:
            # 1. Run the instant math calculations
            run_physics_tick()
            
            # 2. Check if it is time to generate a new AI log
            current_time = time.time()
            if current_time - last_ai_run >= AI_COOLDOWN:
                run_ai_logging_pass(state, all_objects)
                last_ai_run = time.time()
        
        # Fast 5-second sleep for the physics engine
        time.sleep(5)
