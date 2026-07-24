import os
import time
import random
import requests
import math

# --- CONFIGURATION ---
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://nnntebgkhgzfztwfdphw.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ubnRlYmdraGd6Znp0d2ZkcGh3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDU3NTQ1NiwiZXhwIjoyMTAwMTUxNDU2fQ.YxpoNTujXCrJQcxZ9Bj8f_bFC6j_Fq6GLt74H8mEAq0")

# Local Offline Ollama Service Engine (Oracle Cloud Internal Loop)
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://127.0.0.1:11434/api/generate")
DEFAULT_MODEL = "llama3.2:3b"

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal, resolution=merge-duplicates" # For bulk upserts
}

# AI System Prompt 
SYSTEM_PROMPT = """You are ORIGIN, an omniscient observer entity monitoring a dynamic, expanding cosmic simulation.

Core Rules & Scientific Guidelines:
1. Object Terminology: Use mathematically precise physical terms ('Black Hole' instead of generic 'Singularity'; 'Schwarzschild Horizon', 'Neutron Star').
2. Thermodynamics & Scale: Hawking radiation temperatures exist on nanokelvin scales (~10^-9 K).
3. Tone Adaptation: If the prompt mentions advanced civilizations (Kardashev > 1) or complex life, adopt a highly atmospheric, sci-fi lore tone. Otherwise, remain a precise, analytical telemetry system.
4. Output: Output exactly 2 sentences containing a profound synthesis of the current cosmic epoch. No preamble."""

# --- DATABASE FETCHERS ---

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

# --- PHYSICS & MATH ENGINE (Phase 3 Implemented) ---

def process_physics_for_object(obj):
    """Calculates lifecycles, thermodynamics, and civilization progression."""
    updates = {}
    obj_type = (obj.get("object_type") or "UNKNOWN").title()
    mass = float(obj.get("mass_solar") or 1.0)
    
    # 1. Stellar Lifecycles & Mass Conservation
    if "Star" in obj_type or obj_type == "Main Sequence":
        hydrogen = float(obj.get("hydrogen_pct") or 100.0)
        # Burn rate scales with mass luminosity relation
        burn_rate = (mass ** 2.5) * 0.05 
        new_hydrogen = max(0.0, hydrogen - burn_rate)
        
        if new_hydrogen != hydrogen:
            updates["hydrogen_pct"] = round(new_hydrogen, 4)
        
        # Stellar Death Triggers
        if new_hydrogen <= 0.0 and not obj.get("is_dead"):
            updates["is_dead"] = True
            if mass > 20.0:
                updates["object_type"] = "Black Hole"
                updates["surface_temp"] = 1e-9 # Nanokelvin Hawking Radiation
                updates["mass_solar"] = round(mass * 0.2, 2) # 80% ejected
            elif mass > 8.0:
                updates["object_type"] = "Neutron Star"
                updates["surface_temp"] = 1000000.0
                updates["mass_solar"] = round(mass * 0.3, 2)
            else:
                updates["object_type"] = "White Dwarf"
                updates["surface_temp"] = 25000.0
                updates["mass_solar"] = round(mass * 0.5, 2)

    # 2. Fix Terminology (Singularity -> Black Hole) & Relativity
    elif obj_type == "Singularity":
        updates["object_type"] = "Black Hole"
        updates["surface_temp"] = 1e-9
        
    # 3. Life Engine, Spectroscopy & Dark Forest
    elif "Planet" in obj_type:
        temp = float(obj.get("surface_temp") or 0.0)
        has_life = obj.get("has_life", False)
        kardashev = float(obj.get("kardashev_scale") or 0.0)
        
        # Goldilocks Zone (Roughly 273K - 373K for liquid water)
        if not has_life and 270 <= temp <= 350:
            abio_index = float(obj.get("abiogenesis_index") or 0.0) + random.uniform(0.01, 0.05)
            updates["abiogenesis_index"] = round(abio_index, 3)
            
            # Spawn Life Trigger
            if abio_index > 1.0:
                updates["has_life"] = True
                updates["biochemistry_class"] = "Carbon-Water"
        
        # Kardashev Advancement
        if has_life:
            progress = float(obj.get("progress_index") or 0.0) + random.uniform(0.1, 0.5)
            updates["progress_index"] = round(progress, 3)
            
            if progress > 10.0 and kardashev < 1.0:
                updates["kardashev_scale"] = 1.0 # Planetary civilization
            elif progress > 50.0 and kardashev < 2.0:
                updates["kardashev_scale"] = 2.0 # Dyson Swarm built
                updates["surface_temp"] = temp + 50 # Industrial heating
            elif progress > 200.0 and kardashev < 3.0:
                updates["kardashev_scale"] = 3.0 # Galactic civilization
                
            # Dark Forest Radio Sphere Expansion (Lightyears)
            if kardashev > 0:
                radius = float(obj.get("radio_sphere_ly") or 0.0) + (kardashev * 1.5)
                updates["radio_sphere_ly"] = round(radius, 2)

    # If modifications were made, return the object with its ID for batch updating
    if updates:
        updates["id"] = obj["id"]
        return updates
    return None

def run_physics_tick(all_objects):
    """Loops through all objects, calculates math, and pushes updates to database."""
    batch_updates = []
    for obj in all_objects:
        modifications = process_physics_for_object(obj)
        if modifications:
            batch_updates.append(modifications)
            
    # Bulk push modified objects back to Supabase
    if batch_updates:
        try:
            res = requests.post(f"{SUPABASE_URL}/rest/v1/celestial_objects", headers=HEADERS, json=batch_updates, timeout=5)
            if res.status_code not in [200, 201, 204]:
                print(f"⚠️ [PHYSICS DB WARN]: {res.text}")
        except Exception as e:
            pass

# --- AI DATA PREP & GENERATION ---

def analyze_matrix_data(objects):
    if not objects:
        return "NO_CELESTIAL_BODIES_DETECTED", 0, 0.0, 0.0
    
    life_count = sum(1 for o in objects if o.get('has_life'))
    max_kardashev = max((float(o.get('kardashev_scale') or 0.0) for o in objects), default=0.0)
    
    total_temp = sum(float(o.get('surface_temp') or 0.0) for o in objects)
    avg_temp = round(total_temp / len(objects), 2) if objects else 0.0
    
    matrix_lines = ["ID|NAME|TYPE|TEMP_K|LIFE|BIO|PROG|KARDASHEV"]
    for o in objects[:40]: # Send sample to AI
        obj_type = o.get('object_type', 'UNKNOWN').title()
        if obj_type == "Singularity": obj_type = "Black Hole"
            
        matrix_lines.append(f"{o.get('id')}|{o.get('name')}|{obj_type}|{o.get('surface_temp')}|{o.get('has_life')}|{o.get('biochemistry_class') or 'NONE'}|{o.get('progress_index', 0.0)}|{o.get('kardashev_scale', 0.0)}")

    return "\n".join(matrix_lines), life_count, max_kardashev, avg_temp

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

def run_ai_logging_pass(state, all_objects):
    matrix_data, life_count, max_kard, avg_temp = analyze_matrix_data(all_objects)
    age = float(state.get('age', 0.0))
    
    prompt = f"COSMIC AGE: {age:.6f} Gyr\nInhabited Bodies: {life_count}\nMax Kardashev Scale: Type {max_kard:.2f}\nAvg Temp: {avg_temp} K\nTotal Objects: {len(all_objects)}\n\nMATRIX TELEMETRY:\n{matrix_data}"
    
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
        "temporal_simulation": "Relativistic vectors active.",
        "resolution": thought
    }
    
    requests.post(f"{SUPABASE_URL}/rest/v1/origin_logs", headers=HEADERS, json=log_data, timeout=5)

# --- MASTER RUNNER ---

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
            # 1. Math Phase: Instant, complex physics calculations
            run_physics_tick(all_objects)
            
            # 2. AI Phase: Throttle AI generations to prevent CPU overload
            current_time = time.time()
            if current_time - last_ai_run >= AI_COOLDOWN:
                run_ai_logging_pass(state, all_objects)
                last_ai_run = time.time()
        
        # Fast 5-second sleep for the physics engine
        time.sleep(5)
