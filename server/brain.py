import json, math, os, random, threading, time, urllib.request

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://nnntebgkhgzfztwfdphw.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "PLACEHOLDER_KEY")
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://127.0.0.1:11434/api/generate")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2:3b")

SYSTEM_PROMPT = """You are ORIGIN, an omniscient observer entity monitoring a dynamic, expanding cosmic simulation. Output exactly 2 sentences containing a profound synthesis of the current cosmic epoch. No preamble."""

def db_request(endpoint, method="GET", payload=None):
    url = f"{SUPABASE_URL}/rest/v1/{endpoint}"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json"
    }
    data = json.dumps(payload).encode('utf-8') if payload else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            body = resp.read().decode('utf-8')
            return json.loads(body) if body else None
    except Exception as e:
        print(f"[DB ERROR] {method} {endpoint}: {e}", flush=True)
        return None

def db_upsert(table, payload):
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates"
    }
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            return True
    except Exception as e:
        print(f"[DB ERROR] POST {table}: {e}", flush=True)
        return False

def get_era_time_step(age_gyr):
    if age_gyr < 0.001: return 0.0001
    elif age_gyr < 0.1: return 0.001
    elif age_gyr < 1.0: return 0.005
    else: return 0.01

ai_busy = False

def bg_generate_decision(state):
    global ai_busy
    try:
        age_gyr = state.get("age", 0.0)
        epoch_name = state.get("epoch", "Cosmic Era")
        
        prompt = f"{SYSTEM_PROMPT}\nCOSMIC AGE: {age_gyr:.6f} Gyr. ERA: {epoch_name}."
        payload = {"model": OLLAMA_MODEL, "prompt": prompt, "stream": False, "options": {"num_predict": 80}}
        
        thought = ""
        try:
            req = urllib.request.Request(OLLAMA_URL, data=json.dumps(payload).encode('utf-8'), headers={"Content-Type": "application/json"}, method="POST")
            with urllib.request.urlopen(req, timeout=4) as resp:
                res = json.loads(resp.read().decode('utf-8'))
                thought = res.get("response", "").strip()
        except Exception:
            pass

        if not thought:
            thought = f"Cosmic age advances to {age_gyr:.4f} Gyr. Primordial thermodynamic density fields stabilize across active space-time sectors."

        x = round((hash(str(age_gyr) + "x") % 4000 - 2000) / 10.0, 1)
        y = round((hash(str(age_gyr) + "y") % 4000 - 2000) / 10.0, 1)
        z = round((hash(str(age_gyr) + "z") % 4000 - 2000) / 10.0, 1)
        dist_ly = math.sqrt(x**2 + y**2 + z**2)
        latency_myr = round(dist_ly / 1_000_000.0, 6)

        log_entry = {
            "sector": f"VECTOR: [{x:+.1f}, {y:+.1f}, {z:+.1f}] ly",
            "subject": "Cosmic Observation",
            "type_tag": "Autonomous Decision",
            "latency_myr": latency_myr,
            "data_analysis": f"Epoch: {epoch_name} | Age: {age_gyr:.4f} Gyr",
            "temporal_simulation": "Relativistic expansion active.",
            "resolution": thought,
            "goal": "Observe cosmic evolution",
            "reasoning": f"Grounded matrix pass at age {age_gyr} Gyr.",
            "action": "No intervention",
            "hoped_outcome": "Thermal equilibrium",
            "mode": "OBSERVE ONLY",
            "age_gyr": age_gyr,
            "tick": int(age_gyr * 100000)
        }
        db_upsert("origin_logs", log_entry)
        print(f"[AI DECISION LOGGED] Age: {age_gyr} Gyr", flush=True)
    except Exception as e:
        print(f"[AI THREAD ERROR] {e}", flush=True)
    finally:
        ai_busy = False

def run_loop():
    global ai_busy
    print("[PROJECT ORIGIN ENGINE STARTED]", flush=True)
    
    res_state = db_request("universe_state?id=eq.1")
    if not res_state:
        db_upsert("universe_state", {
            "id": 1, "age": 0.0, "epoch": "Inflation Era", "redshift": 1100.0,
            "entropy": 0.001, "de_pct": 68.3, "dm_pct": 26.8, "baryon_pct": 4.9,
            "goal": "Cosmic Genesis", "reasoning": "Big Bang initialized."
        })
        
    res_stats = db_request("catalog_stats?id=eq.1")
    if not res_stats:
        db_upsert("catalog_stats", {
            "id": 1, "nebulae": 0, "stars": 0, "black_holes": 0, "neutron_stars": 0,
            "planets": 0, "moons": 0, "asteroids_comets": 0, "quasars": 0,
            "dark_matter_struc": 0, "exotic_objects": 0
        })

    tick = 0
    while True:
        try:
            res = db_request("universe_state?id=eq.1")
            state = res[0] if res else {"id": 1, "age": 0.0, "epoch": "Primordial Era"}
            
            tick += 1
            curr_age = float(state.get("age", 0.0))
            age_gyr = round(curr_age + get_era_time_step(curr_age), 6)
            
            if age_gyr < 0.001: epoch = "Inflation & Primordial Era"
            elif age_gyr < 0.01: epoch = "Recombination / Dark Ages"
            elif age_gyr < 0.1: epoch = "First Stars & Protogalaxies"
            elif age_gyr < 1.0: epoch = "Galaxy Formation Era"
            else: epoch = "Stellar & Deep Time Era"

            updated_state = {
                "id": 1,
                "age": age_gyr,
                "epoch": epoch,
                "redshift": max(0.0, round(1100.0 / (1.0 + age_gyr * 10), 1)),
                "entropy": round(0.001 + age_gyr * 5, 4)
            }
            db_upsert("universe_state", updated_state)
            print(f"✨ [TICK {tick}]: Age advanced to {age_gyr} Gyr ({epoch})", flush=True)

            if tick % 3 == 0 and not ai_busy:
                ai_busy = True
                threading.Thread(target=bg_generate_decision, args=(updated_state,), daemon=True).start()

        except Exception as e:
            print(f"[MAIN LOOP ERROR] {e}", flush=True)
            
        time.sleep(3)

if __name__ == "__main__":
    run_loop()
