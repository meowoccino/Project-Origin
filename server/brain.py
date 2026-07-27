import json, math, os, random, threading, time, requests

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://nnntebgkhgzfztwfdphw.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "PLACEHOLDER_KEY")
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://127.0.0.1:11434/api/generate")
DEFAULT_MODEL = "llama3.2:3b"

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

ai_busy = False

daily_stats = {
    "observations": 0, "interventions": 0, 
    "last_summary_time": time.time(), "recent_actions": []
}

def db_get(endpoint):
    try:
        res = requests.get(f"{SUPABASE_URL}/rest/v1/{endpoint}", headers=HEADERS, timeout=5)
        return res.json() if res.status_code == 200 else []
    except: return []

def db_upsert(table, payload):
    try:
        headers = {**HEADERS, "Prefer": "resolution=merge-duplicates"}
        requests.post(f"{SUPABASE_URL}/rest/v1/{table}", headers=headers, json=payload, timeout=5)
    except: pass

def db_patch(table, obj_id, payload):
    try:
        requests.patch(f"{SUPABASE_URL}/rest/v1/{table}?id=eq.{obj_id}", headers=HEADERS, json=payload, timeout=5)
    except: pass

def get_volatile_targets():
    targets = []
    stars = db_get("celestial_objects?object_type=ilike.*star*&is_dead=is.false&order=hydrogen_pct.asc&limit=1")
    if stars: targets.append(stars[0])
    
    planets = db_get("celestial_objects?object_type=ilike.*planet*&has_life=is.false&order=abiogenesis_index.desc&limit=1")
    if planets: targets.append(planets[0])
    
    life = db_get("celestial_objects?has_life=is.true&order=progress_index.desc&limit=1")
    if life: targets.append(life[0])
    
    if not targets:
        targets = db_get("celestial_objects?limit=3")
        
    return targets

def build_dynamic_prompt(target):
    obj_type = (target.get("object_type") or "").lower()
    
    if "star" in obj_type:
        levers = "['thermal_convection' (alters hydrogen_pct), 'mass_ejection' (alters mass_solar)]"
    elif "planet" in obj_type:
        levers = "['greenhouse_ratio' (alters surface_temp), 'orbital_velocity' (alters abiogenesis_index)]"
    elif "black hole" in obj_type or "singularity" in obj_type:
        levers = "['accretion_friction' (alters mass_solar), 'kerr_spin' (alters radio_sphere_ly)]"
    else:
        levers = "['density_shift' (alters mass_solar)]"

    return f"""You are ORIGIN, an autonomous AI directing a cosmic simulation.
Analyze the target and output your decision in STRICT JSON format.
Choose "OBSERVATION" to monitor, or "INTERVENTION" to alter a parameter.
If INTERVENTION, you MUST select one of these physical levers: {levers}.

Format exactly like this:
{{
  "mode": "OBSERVATION" or "INTERVENTION",
  "goal": "Brief goal description",
  "reasoning": "Scientific reasoning using the exact data provided",
  "lever_pulled": "Specific lever from the list, or 'None'",
  "parameter_delta": A positive or negative float to apply to the target,
  "calculated_outcome": "Expected physical result"
}}"""

def execute_physical_intervention(target_id, target_data, ai_response):
    lever = ai_response.get("lever_pulled", "None")
    delta = float(ai_response.get("parameter_delta", 0.0))
    
    if lever == "None" or delta == 0.0:
        return ai_response.get("action", "Passive Monitoring")
        
    updates = {}
    action_log = ""
    
    if lever == "thermal_convection":
        new_val = max(0.0, float(target_data.get("hydrogen_pct", 100)) + delta)
        updates["hydrogen_pct"] = round(new_val, 4)
        action_log = f"Induced thermal convection. Hydrogen shifted by {delta}%."
    elif lever in ["mass_ejection", "accretion_friction", "density_shift"]:
        new_val = max(0.1, float(target_data.get("mass_solar", 1.0)) + delta)
        updates["mass_solar"] = round(new_val, 2)
        action_log = f"Altered mass by {delta} M_sun."
    elif lever == "greenhouse_ratio":
        new_val = float(target_data.get("surface_temp", 250)) + delta
        updates["surface_temp"] = round(new_val, 2)
        action_log = f"Modified greenhouse ratio. Surface temp shifted by {delta} K."
    elif lever == "orbital_velocity":
        new_val = max(0.0, float(target_data.get("abiogenesis_index", 0.0)) + delta)
        updates["abiogenesis_index"] = round(new_val, 3)
        action_log = f"Adjusted orbital velocity. Abiogenesis index shifted by {delta}."
    elif lever == "kerr_spin":
        new_val = max(0.0, float(target_data.get("radio_sphere_ly", 0.0)) + delta)
        updates["radio_sphere_ly"] = round(new_val, 2)
        action_log = f"Altered Kerr spin limits."
        
    if updates:
        db_patch("celestial_objects", target_id, updates)
        return action_log
        
    return "Attempted intervention, but parameters were outside physical limits."

def bg_generate_decision(state):
    global ai_busy, daily_stats
    try:
        age_gyr = state.get("age", 0.0)
        targets = get_volatile_targets()
        if not targets: return
        target = random.choice(targets)
        
        sys_prompt = build_dynamic_prompt(target)
        user_prompt = f"TARGET DATA: {json.dumps(target)}"
        
        payload = {
            "model": DEFAULT_MODEL,
            "prompt": f"{sys_prompt}\n\n{user_prompt}",
            "stream": False,
            "format": "json",
            "options": {"temperature": 0.6}
        }
        
        ai_response = {}
        try:
            res = requests.post(OLLAMA_URL, json=payload, timeout=20)
            if res.status_code == 200:
                raw_text = res.json().get("response", "{}")
                ai_response = json.loads(raw_text)
        except Exception as e:
            print(f"[LLM ERROR] {e}", flush=True)

        mode = ai_response.get("mode", "OBSERVATION").upper()
        goal = ai_response.get("goal", "Maintain thermodynamic balance")
        reasoning = ai_response.get("reasoning", "Metrics align with standard models.")
        outcome = ai_response.get("calculated_outcome", "Stable evolution expected.")

        final_action = "Passive Monitoring"
        if mode == "INTERVENTION":
            final_action = execute_physical_intervention(target["id"], target, ai_response)
            daily_stats["interventions"] += 1
            daily_stats["recent_actions"].append(final_action)
        else:
            daily_stats["observations"] += 1

        x, y, z = target.get("x_coord", 0), target.get("y_coord", 0), target.get("z_coord", 0)
        dist_ly = math.sqrt(x**2 + y**2 + z**2)
        latency_myr = round(dist_ly / 1_000_000.0, 6)

        log_entry = {
            "sector": f"SEC [{x}, {y}, {z}]",
            "subject": target.get("designation", "Unknown Body"),
            "type_tag": "AI Telemetry",
            "latency_myr": latency_myr,
            "data_analysis": reasoning,
            "temporal_simulation": outcome,
            "resolution": final_action,
            "goal": goal,
            "reasoning": reasoning,
            "action": final_action,
            "hoped_outcome": outcome,
            "mode": mode,
            "age_gyr": age_gyr,
            "tick": int(age_gyr * 100000)
        }
        db_upsert("origin_logs", log_entry)
        print(f"[{mode}] Executed on {target.get('designation')} at Age: {age_gyr} Gyr", flush=True)

    except Exception as e:
        print(f"[AI THREAD ERROR] {e}", flush=True)
    finally:
        ai_busy = False

def calculate_dual_phase_age(genesis_time):
    elapsed_sec = time.time() - genesis_time
    if elapsed_sec <= 3600:
        return round((elapsed_sec / 3600.0) * 13.8, 6)
    else:
        elapsed_phase_2 = min(elapsed_sec - 3600, 2592000)
        age_added = (elapsed_phase_2 / 2592000.0) * 9986.2
        return round(13.8 + age_added, 6)

def run_loop():
    global ai_busy
    print(f"[PROJECT ORIGIN AI] Online. Model: {DEFAULT_MODEL}", flush=True)
    
    # SAFE NULL CHECK FIX
    res_state = db_get("universe_state?id=eq.1")
    genesis_val = res_state[0].get("genesis_time") if res_state else None
    
    if genesis_val is None:
        genesis = time.time()
        db_upsert("universe_state", {
            "id": 1, "age": 0.0, "genesis_time": genesis, "epoch": "Inflation Era", 
            "redshift": 1100.0, "entropy": 0.001
        })
    else:
        genesis = float(genesis_val)
        
    tick = 0
    while True:
        try:
            age_gyr = calculate_dual_phase_age(genesis)
            
            if age_gyr < 0.001: epoch = "Inflation & Primordial Era"
            elif age_gyr < 0.01: epoch = "Recombination / Dark Ages"
            elif age_gyr < 0.1: epoch = "First Stars & Protogalaxies"
            elif age_gyr < 1.0: epoch = "Galaxy Formation Era"
            else: epoch = "Stellar & Deep Time Era"

            updated_state = {
                "id": 1,
                "age": age_gyr,
                "epoch": epoch,
                "genesis_time": genesis,
                "redshift": max(0.0, round(1100.0 / (1.0 + age_gyr * 10), 1)),
                "entropy": round(0.001 + age_gyr * 5, 4)
            }
            db_upsert("universe_state", updated_state)
            print(f"✨ [TIMELINE]: Age locked to {age_gyr} Gyr ({epoch})", flush=True)

            tick += 1
            if tick % 15 == 0 and not ai_busy: 
                ai_busy = True
                threading.Thread(target=bg_generate_decision, args=(updated_state,), daemon=True).start()

        except Exception as e:
            print(f"[MAIN LOOP ERROR] {e}", flush=True)
            
        time.sleep(3)

if __name__ == "__main__":
    run_loop()
