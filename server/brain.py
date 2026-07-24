import os
import time
import random
import requests
import threading

# --- CONFIGURATION & SECURITY ---
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://nnntebgkhgzfztwfdphw.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_KEY:
    raise RuntimeError("❌ CRITICAL: 'SUPABASE_KEY' environment variable is not set!")

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://127.0.0.1:11434/api/generate")
DEFAULT_MODEL = "llama3.2:3b"

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json"
}

SYSTEM_PROMPT = """You are ORIGIN. Output exactly 2 sentences containing a profound synthesis of the current cosmic epoch. No preamble."""

# --- DATABASE OPERATIONS ---

def db_get(endpoint):
    try:
        res = requests.get(f"{SUPABASE_URL}/rest/v1/{endpoint}", headers=HEADERS, timeout=5)
        if res.status_code == 200:
            return res.json()
        print(f"❌ [DB GET ERROR {res.status_code}]: {res.text}")
    except Exception as e:
        print(f"🛑 [DB GET NETWORK ERROR]: {e}")
    return []

def db_upsert(table, payload):
    try:
        headers = {**HEADERS, "Prefer": "resolution=merge-duplicates, return=minimal"}
        body = payload if isinstance(payload, list) else [payload]
        res = requests.post(f"{SUPABASE_URL}/rest/v1/{table}", headers=headers, json=body, timeout=5)
        if res.status_code >= 400:
            print(f"❌ [DB UPSERT ERROR {res.status_code}]: {res.text}")
    except Exception as e:
        print(f"🛑 [DB UPSERT NETWORK ERROR]: {e}")

def db_post(table, payload):
    try:
        headers = {**HEADERS, "Prefer": "return=minimal"}
        res = requests.post(f"{SUPABASE_URL}/rest/v1/{table}", headers=headers, json=payload, timeout=5)
        if res.status_code >= 400:
            print(f"❌ [DB POST ERROR {res.status_code}]: {res.text}")
    except Exception as e:
        print(f"🛑 [DB POST NETWORK ERROR]: {e}")

# --- PHASE 3: PHYSICS ENGINE ---

def run_physics_tick(all_objects):
    batch_updates = []
    for obj in all_objects:
        updates = {}
        obj_type = (obj.get("object_type") or "UNKNOWN").title()
        mass = float(obj.get("mass_solar") or 1.0)
        
        if "Star" in obj_type or obj_type == "Main Sequence":
            hydrogen = float(obj.get("hydrogen_pct") or 100.0)
            burn_rate = (mass ** 2.5) * 0.05 
            new_hydrogen = max(0.0, hydrogen - burn_rate)
            if new_hydrogen != hydrogen: 
                updates["hydrogen_pct"] = round(new_hydrogen, 4)
            if new_hydrogen <= 0.0 and not obj.get("is_dead"):
                updates["is_dead"] = True
                if mass > 20.0: updates["object_type"], updates["surface_temp"], updates["mass_solar"] = "Black Hole", 1e-9, round(mass * 0.2, 2)
                elif mass > 8.0: updates["object_type"], updates["surface_temp"], updates["mass_solar"] = "Neutron Star", 1000000.0, round(mass * 0.3, 2)
                else: updates["object_type"], updates["surface_temp"], updates["mass_solar"] = "White Dwarf", 25000.0, round(mass * 0.5, 2)
        elif "Planet" in obj_type:
            temp, has_life, kardashev = float(obj.get("surface_temp") or 0.0), obj.get("has_life", False), float(obj.get("kardashev_scale") or 0.0)
            if not has_life and 270 <= temp <= 350:
                abio_index = float(obj.get("abiogenesis_index") or 0.0) + random.uniform(0.01, 0.05)
                updates["abiogenesis_index"] = round(abio_index, 3)
                if abio_index > 1.0: updates["has_life"], updates["biochemistry_class"] = True, "Carbon-Water"
            if has_life:
                progress = float(obj.get("progress_index") or 0.0) + random.uniform(0.1, 0.5)
                updates["progress_index"] = round(progress, 3)
                if progress > 10.0 and kardashev < 1.0: updates["kardashev_scale"] = 1.0
                elif progress > 50.0 and kardashev < 2.0: updates["kardashev_scale"], updates["surface_temp"] = 2.0, temp + 50 
                elif progress > 200.0 and kardashev < 3.0: updates["kardashev_scale"] = 3.0
                if kardashev > 0: updates["radio_sphere_ly"] = round(float(obj.get("radio_sphere_ly") or 0.0) + (kardashev * 1.5), 2)
        
        if updates:
            updates["id"] = obj["id"]
            updates["name"] = obj.get("name") or "Unknown Anomaly"
            updates["object_type"] = obj.get("object_type") or "Cosmic Body"
            updates["category"] = obj.get("category") or "stars"
            batch_updates.append(updates)
            
    if batch_updates:
        db_upsert("celestial_objects", batch_updates)

# --- UNIVERSE EXPANSION ENGINE ---

def generate_unique_physics(category_key):
    if category_key == "nebulae": return category_key, "Nebula Cloud", f"Gas Temp: {random.randint(10, 80)} K, Mass: {random.randint(100, 15000)} M_sun"
    elif category_key == "stars": return category_key, "Class-O Star", f"Mass: {round(random.uniform(15.0, 60.0), 1)} M_sun, Core Temp: {random.randint(30000, 50000)} K"
    elif category_key == "black_holes": return category_key, "Stellar-Mass Black Hole", f"Mass: {round(random.uniform(5.0, 85.0), 1)} M_sun, Spin: {round(random.uniform(0.12, 0.98), 2)} Kerr"
    elif category_key == "neutron_stars": return category_key, "Pulsar Burst", f"B-Field: 10^{random.randint(11, 15)} Gauss, Spin Period: {round(random.uniform(1.2, 85.0), 1)} ms"
    elif category_key == "planets": return category_key, "Terrestrial Planet", f"Surface Gravity: {round(random.uniform(0.4, 2.2), 2)} g, Orbit: {round(random.uniform(0.3, 2.5), 2)} AU"
    elif category_key == "moons": return category_key, "Major Satellite", f"Radius: {random.randint(300, 2800)} km, Core: Silicate Ice"
    elif category_key == "quasars": return category_key, "Active Quasar", f"Redshift z: {round(random.uniform(0.8, 6.5), 2)}"
    elif category_key == "asteroids": return category_key, "Asteroid Belt", f"Fragment Count: {random.randint(50, 5000)}"
    else: return category_key, "Exotic Anomaly", f"Energy Flux: {round(random.uniform(1.0, 99.0), 1)} TeraWatts"

def call_local_ollama_name(category, specs):
    payload = {"model": DEFAULT_MODEL, "prompt": f"Generate ONE unique short futuristic name for a celestial {category}. Output ONLY the name.", "stream": False, "options": {"temperature": 0.8, "num_predict": 10}}
    try:
        res = requests.post(OLLAMA_URL, json=payload, timeout=4)
        if res.status_code == 200:
            name = res.json().get("response", "").strip(' "\'\n')
            if name: return name
    except Exception as e:
        print(f"⚠️ [OLLAMA NAME TIMEOUT]: {e}")
    
    prefixes = ["Vortex", "Astra", "Chronos", "Kaelor", "Nivar", "Zephyr", "Solus", "Aether"]
    return f"{random.choice(prefixes)}-{random.randint(100, 999)}"

def run_expansion_step(state, stats):
    current_age = float(state.get("age", 0.001))
    new_age = round(current_age + 0.005, 3)

    db_upsert("universe_state", {"id": 1, "age": new_age, "de_pct": 68.5, "dm_pct": 26.4, "baryon_pct": 5.1})

    c_nebulae, c_stars = stats.get("nebulae", 0), stats.get("stars", 0)
    possible_spawns = ["nebulae"]
    if c_nebulae >= 1: possible_spawns.extend(["stars", "asteroids"])
    if c_stars >= 3: possible_spawns.extend(["planets", "moons"])
    if c_stars >= 8: possible_spawns.extend(["neutron_stars", "black_holes"])
    if c_stars >= 15: possible_spawns.extend(["quasars", "exotic_objects"])

    cat_key = random.choice(possible_spawns)
    _, cat_label, physics_specs = generate_unique_physics(cat_key)
    
    ai_name = call_local_ollama_name(cat_label, physics_specs)
    print(f"✨ [EXPANSION]: Age {new_age} Gyr | Spawned: {ai_name} ({cat_label})")

    current_val = stats.get(cat_key, 0)
    updated_stats = {**stats, "id": 1, cat_key: current_val + 1}
    db_upsert("catalog_stats", updated_stats)

    db_post("events", {"title": f"{ai_name} ({cat_label})", "description": f"Evolutionary shift detected at Age {new_age} Gyr. Specs: {physics_specs}.", "age": new_age, "category": cat_key})
    db_post("celestial_objects", {"name": ai_name, "object_type": cat_label, "category": cat_key})

# --- ASYNCHRONOUS AI LORE THREAD ---

def bg_generate_lore(state, all_objects):
    life_count = sum(1 for o in all_objects if o.get('has_life'))
    max_kard = max((float(o.get('kardashev_scale') or 0.0) for o in all_objects), default=0.0)
    age = float(state.get('age', 0.0))
    lines = [f"{o.get('id')}|{o.get('object_type', 'UNKNOWN').title()}|{o.get('surface_temp')}" for o in all_objects[:30]]
    prompt = f"COSMIC AGE: {age:.6f} Gyr\nInhabited: {life_count}\nMax Kardashev: Type {max_kard:.2f}\nTotal Objects: {len(all_objects)}\nTELEMETRY:\n" + "\n".join(lines)
    payload = {"model": DEFAULT_MODEL, "prompt": f"{SYSTEM_PROMPT}\n\nMETRICS:\n{prompt}\n\nSYNTHESIS:", "stream": False, "options": {"temperature": 0.7, "num_predict": 120}}
    
    thought = None
    try:
        print("🧠 [ORIGIN THREAD] Querying local Ollama model...")
        res = requests.post(OLLAMA_URL, json=payload, timeout=40)
        if res.status_code == 200:
            thought = res.json().get("response", "").strip()
        else:
            print(f"❌ [OLLAMA HTTP ERROR {res.status_code}]: {res.text}")
    except Exception as e:
        print(f"⚠️ [OLLAMA THREAD WARN]: {e}")

    if not thought:
        thought = f"Space-time grid expanding normally at epoch {age:.3f} Gyr. Thermodynamic density gradients remain within theoretical bounds."

    print(f"👁️ [ORIGIN THOUGHT]: {thought}")
    db_post("origin_logs", {
        "mode": "OBSERVE", 
        "sector": f"Sector {random.randint(1, 12):02d}", 
        "subject": "Matrix Sweep", 
        "type_tag": "Complete Telemetry", 
        "latency_myr": round(random.uniform(0.1, 0.5), 2), 
        "data_analysis": f"Age: {age:.3f} Gyr | Active Bodies: {len(all_objects)}", 
        "temporal_simulation": "Relativistic vectors active.", 
        "resolution": thought
    })

# --- MASTER TIMELOOP ---

if __name__ == "__main__":
    print(f"🚀 [ORIGIN MASTER ENGINE] Online. Model: {DEFAULT_MODEL}")
    print(f"⏱️ Cycles: Math (5s) | Expand (15s) | Lore (45s Threaded)\n")
    
    t_math, t_expand, t_lore = 0, 0, 0
    
    while True:
        now = time.time()
        
        # 1. Physics Math (Every 5s)
        if now - t_math >= 5:
            objs = db_get("celestial_objects?select=*&limit=1000")
            if objs: run_physics_tick(objs)
            t_math = now
            
        # 2. Universe Expansion (Every 15s)
        if now - t_expand >= 15:
            state_data = db_get("universe_state?id=eq.1")
            stats_data = db_get("catalog_stats?id=eq.1")
            
            st = state_data[0] if state_data else {"id": 1, "age": 0.001}
            sp = stats_data[0] if stats_data else {"id": 1}
            
            run_expansion_step(st, sp)
            t_expand = now
            
        # 3. AI Lore Generation (Every 45s - Non-Blocking Thread)
        if now - t_lore >= 45:
            state_data = db_get("universe_state?id=eq.1")
            objs = db_get("celestial_objects?select=*&limit=500")
            st = state_data[0] if state_data else {"id": 1, "age": 0.001}
            threading.Thread(target=bg_generate_lore, args=(st, objs), daemon=True).start()
            t_lore = now
            
        time.sleep(1)
