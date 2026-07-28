import json, math, os, random, threading, time, requests, re

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://nnntebgkhgzfztwfdphw.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "PLACEHOLDER_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

ai_busy = False
daily_stats = {"observations": 0, "interventions": 0, "last_summary_time": time.time(), "recent_actions": []}

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
    
    if not targets: targets = db_get("celestial_objects?limit=3")
    return targets

def build_dynamic_prompt(target):
    obj_type = (target.get("object_type") or "").lower()
    if "star" in obj_type: levers = "['thermal_convection', 'mass_ejection']"
    elif "planet" in obj_type: levers = "['greenhouse_ratio', 'orbital_velocity']"
    elif "black hole" in obj_type or "singularity" in obj_type: levers = "['accretion_friction', 'kerr_spin']"
    else: levers = "['density_shift']"

    return f"""You are ORIGIN, an autonomous AI directing a cosmic simulation.
Analyze the target and output your decision in STRICT JSON format. NO CONVERSATION.
Choose "OBSERVATION" or "INTERVENTION".
If INTERVENTION, select one lever: {levers}.

{{
  "mode": "OBSERVATION" or "INTERVENTION",
  "goal": "Brief goal",
  "reasoning": "Scientific reasoning",
  "lever_pulled": "Specific lever or 'None'",
  "parameter_delta": 5.0,
  "calculated_outcome": "Expected result"
}}"""

def execute_physical_intervention(target_id, target_data, ai_response):
    lever = ai_response.get("lever_pulled", "None")
    delta = float(ai_response.get("parameter_delta", 0.0))
    if lever == "None" or delta == 0.0: return ai_response.get("action", "Passive Monitoring")
        
    updates = {}
    action_log = ""
    
    if lever == "thermal_convection":
        updates["hydrogen_pct"] = max(0.0, float(target_data.get("hydrogen_pct", 100)) + delta)
        action_log = f"Induced thermal convection by {delta}%."
    elif lever in ["mass_ejection", "accretion_friction", "density_shift"]:
        updates["mass_solar"] = max(0.1, float(target_data.get("mass_solar", 1.0)) + delta)
        action_log = f"Altered mass by {delta} M_sun."
    elif lever == "greenhouse_ratio":
        updates["surface_temp"] = float(target_data.get("surface_temp", 250)) + delta
        action_log = f"Modified greenhouse ratio by {delta} K."
    elif lever == "orbital_velocity":
        updates["abiogenesis_index"] = max(0.0, float(target_data.get("abiogenesis_index", 0.0)) + delta)
        action_log = f"Adjusted orbital velocity."
    elif lever == "kerr_spin":
        updates["radio_sphere_ly"] = max(0.0, float(target_data.get("radio_sphere_ly", 0.0)) + delta)
        action_log = f"Altered Kerr spin limits."
        
    if updates:
        db_patch("celestial_objects", target_id, updates)
        return action_log
    return "Parameters outside limits."

def bg_generate_decision(state):
    global ai_busy, daily_stats
    try:
        age_gyr = state.get("age", 0.0)
        targets = get_volatile_targets()
        if not targets: return
        target = random.choice(targets)
        
        if not GROQ_API_KEY:
            print("[AI ERROR] Missing GROQ_API_KEY.", flush=True)
            return

        sys_prompt = build_dynamic_prompt(target)
        groq_headers = {
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": "llama-3.1-8b-instant",
            "messages": [
                {"role": "system", "content": sys_prompt},
                {"role": "user", "content": f"TARGET: {json.dumps(target)}"}
            ],
            "temperature": 0.6,
            "response_format": {"type": "json_object"}
        }
        
        ai_response = {}
        try:
            res = requests.post("https://api.groq.com/openai/v1/chat/completions", headers=groq_headers, json=payload, timeout=20)
            if res.status_code == 200:
                raw_text = res.json()["choices"][0]["message"]["content"]
                match = re.search(r'\{.*\}', raw_text, re.DOTALL)
                if match: ai_response = json.loads(match.group(0))
            else:
                print(f"[GROQ ERROR] {res.text}", flush=True)
        except Exception as e: 
            print(f"[LLM CONNECTION FAILED] {e}", flush=True)

        mode = ai_response.get("mode", "OBSERVATION").upper()
        
        final_action = "Passive Monitoring"
        if mode == "INTERVENTION":
            final_action = execute_physical_intervention(target["id"], target, ai_response)
            daily_stats["interventions"] += 1
        else: daily_stats["observations"] += 1

        x, y, z = target.get("x_coord", 0), target.get("y_coord", 0), target.get("z_coord", 0)
        dist_ly = math.sqrt(x**2 + y**2 + z**2)
        
        db_upsert("origin_logs", {
            "sector": f"SEC [{x}, {y}, {z}]",
            "subject": target.get("designation", "Unknown Body"),
            "type_tag": "AI Telemetry",
            "latency_myr": round(dist_ly / 1_000_000.0, 6),
            "data_analysis": ai_response.get("reasoning", "Nominal data streaming. AI offline or standing by."),
            "temporal_simulation": ai_response.get("calculated_outcome", "Stable trajectory."),
            "resolution": final_action,
            "mode": mode,
            "age_gyr": age_gyr,
            "tick": int(age_gyr * 100000)
        })
    except Exception as e: print(f"[AI THREAD] {e}", flush=True)
    finally: ai_busy = False

def calculate_dual_phase_age(genesis_time):
    elapsed_sec = time.time() - genesis_time
    
    # Phase 1: 1 Hour (3600s) = 0 to 0.1 Gyr
    if elapsed_sec <= 3600:
        return round((elapsed_sec / 3600.0) * 0.1, 6)
    
    # Phase 2: Next 30 Days (2,592,000s) = 0.1 Gyr to 100 Gyr
    else:
        elapsed_phase_2 = elapsed_sec - 3600
        rate_per_sec = 99.9 / (30 * 24 * 3600) 
        age_added = elapsed_phase_2 * rate_per_sec
        return round(0.1 + age_added, 6)

def run_loop():
    global ai_busy
    res_state = db_get("universe_state?id=eq.1")
    genesis_val = res_state[0].get("genesis_time") if res_state else None
    
    if genesis_val is None:
        genesis = time.time()
        db_upsert("universe_state", {"id": 1, "age": 0.0, "genesis_time": genesis, "epoch": "Primordial Inflation"})
    else: genesis = float(genesis_val)
        
    tick = 0
    while True:
        try:
            age_gyr = calculate_dual_phase_age(genesis)
            if age_gyr < 0.001: epoch = "Primordial Inflation"
            elif age_gyr < 0.01: epoch = "Recombination & Decoupling"
            elif age_gyr < 0.1: epoch = "Pop-III Star Reionization"
            elif age_gyr < 1.0: epoch = "Galactic Disk Accretion"
            else: epoch = "Stellar & Deep Time Era"

            db_upsert("universe_state", {"id": 1, "age": age_gyr, "epoch": epoch, "genesis_time": genesis})
            
            tick += 1
            if tick % 15 == 0 and not ai_busy: 
                ai_busy = True
                threading.Thread(target=bg_generate_decision, args=({"age": age_gyr},), daemon=True).start()
        except: pass
        time.sleep(3)

if __name__ == "__main__": run_loop()
