import json, math, os, random, time, requests, re, sys

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

def log_msg(msg):
    print(f"[BRAIN] {msg}", flush=True)

def log_error(context, error):
    print(f"❌ [BRAIN ERROR] {context}: {error}", file=sys.stderr, flush=True)

def db_get(endpoint):
    try:
        res = requests.get(f"{SUPABASE_URL}/rest/v1/{endpoint}", headers=HEADERS, timeout=10)
        res.raise_for_status()
        return res.json()
    except Exception as e:
        log_error(f"GET {endpoint}", e)
        return []

def db_upsert(table, payload):
    try:
        headers = {**HEADERS, "Prefer": "resolution=merge-duplicates"}
        res = requests.post(f"{SUPABASE_URL}/rest/v1/{table}", headers=headers, json=payload, timeout=10)
        res.raise_for_status()
    except Exception as e:
        log_error(f"UPSERT {table}", e)

def db_patch(table, obj_id, payload):
    try:
        res = requests.patch(f"{SUPABASE_URL}/rest/v1/{table}?id=eq.{obj_id}", headers=HEADERS, json=payload, timeout=10)
        res.raise_for_status()
    except Exception as e:
        log_error(f"PATCH {table}", e)

def get_volatile_targets():
    targets = []
    stars = db_get("celestial_objects?object_type=ilike.*star*&is_dead=is.false&order=hydrogen_pct.asc&limit=1")
    if stars: targets.append(stars[0])
    planets = db_get("celestial_objects?object_type=ilike.*planet*&order=created_at.desc&limit=1")
    if planets: targets.append(planets[0])
    if not targets: targets = db_get("celestial_objects?limit=3")
    return targets

def build_dynamic_prompt(target):
    obj_type = (target.get("object_type") or "").lower()
    if "star" in obj_type: levers = "['thermal_convection', 'mass_ejection']"
    elif "planet" in obj_type: levers = "['greenhouse_ratio', 'orbital_velocity']"
    elif "black hole" in obj_type: levers = "['accretion_friction', 'kerr_spin']"
    else: levers = "['density_shift']"

    return f"""You are ORIGIN, an autonomous AI directing a cosmic simulation.
Target ID: {target.get('designation', 'Unknown')}
Analyze the target and output your decision in STRICT JSON format. NO CONVERSATION.
If INTERVENTION, select one lever: {levers}.

{{
  "mode": "OBSERVATION" or "INTERVENTION",
  "goal": "Brief physical goal",
  "reasoning": "Scientific reasoning",
  "lever_pulled": "Specific lever or 'None'",
  "parameter_delta": 5.0,
  "calculated_outcome": "Expected result"
}}"""

def execute_physical_intervention(target_id, target_data, ai_response):
    lever = ai_response.get("lever_pulled", "None")
    delta = float(ai_response.get("parameter_delta", 0.0))
    if lever == "None" or delta == 0.0: return "Passive Monitoring"
        
    updates = {}
    action_log = ""
    
    if lever == "thermal_convection":
        updates["hydrogen_pct"] = max(0.0, float(target_data.get("hydrogen_pct", 100)) + delta)
        action_log = f"Induced thermal convection by {delta}%."
    elif lever in ["mass_ejection", "accretion_friction", "density_shift"]:
        # In a full simulation, this mass must be subtracted from another object.
        updates["mass_solar"] = max(0.1, float(target_data.get("mass_solar", 1.0)) + delta)
        action_log = f"Altered mass by {delta} M_sun."
    elif lever == "greenhouse_ratio":
        updates["surface_temp"] = float(target_data.get("surface_temp", 250)) + delta
        action_log = f"Modified greenhouse ratio by {delta} K."
    elif lever == "orbital_velocity":
        updates["abiogenesis_index"] = max(0.0, float(target_data.get("abiogenesis_index", 0.0)) + delta)
        action_log = f"Adjusted orbital mechanics."
    elif lever == "kerr_spin":
        updates["radio_sphere_ly"] = max(0.0, float(target_data.get("radio_sphere_ly", 0.0)) + delta)
        action_log = f"Altered Kerr spin limits."
        
    if updates:
        db_patch("celestial_objects", target_id, updates)
        return action_log
    return "Parameters outside limits."

def run_ai_cycle(age_gyr):
    targets = get_volatile_targets()
    if not targets: return
    target = random.choice(targets)
    
    if not GROQ_API_KEY:
        log_error("GROQ API", "Missing GROQ_API_KEY.")
        return

    sys_prompt = build_dynamic_prompt(target)
    groq_headers = {"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"}
    payload = {
        "model": "llama3-8b-8192", 
        "messages": [
            {"role": "system", "content": sys_prompt},
            {"role": "user", "content": f"TARGET STATE: {json.dumps(target)}"}
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
            log_error("GROQ REQUEST", res.text)
    except Exception as e: 
        log_error("LLM CONNECTION", e)

    mode = ai_response.get("mode", "OBSERVATION").upper()
    final_action = "Passive Monitoring"
    if mode == "INTERVENTION":
        final_action = execute_physical_intervention(target["id"], target, ai_response)

    x, y, z = target.get("x_coord", 0), target.get("y_coord", 0), target.get("z_coord", 0)
    dist_ly = math.sqrt(x**2 + y**2 + z**2)
    
    db_upsert("origin_logs", {
        "sector": f"SEC [{round(x)}, {round(y)}, {round(z)}]",
        "subject": target.get("designation", "Unknown Body"),
        "type_tag": "AI Telemetry",
        "latency_myr": round(dist_ly / 1_000_000.0, 6),
        "data_analysis": ai_response.get("reasoning", "Nominal tracking."),
        "temporal_simulation": ai_response.get("calculated_outcome", "Stable."),
        "resolution": final_action,
        "mode": mode,
        "age_gyr": age_gyr,
        "tick": int(age_gyr * 100000)
    })

def calculate_dual_phase_age(genesis_time):
    elapsed_sec = time.time() - genesis_time
    if elapsed_sec <= 3600:
        return round((elapsed_sec / 3600.0) * 0.1, 6)
    else:
        elapsed_phase_2 = elapsed_sec - 3600
        rate_per_sec = 99.9 / (30 * 24 * 3600) 
        age_added = elapsed_phase_2 * rate_per_sec
        return round(0.1 + age_added, 6)

if __name__ == "__main__":
    log_msg("🚀 Origin Brain Engine Online. AI cycle 45-60s.")
    if not SUPABASE_URL or not SUPABASE_KEY:
        log_error("STARTUP", "Missing Supabase keys in environment.")
        sys.exit(1)

    res_state = db_get("universe_state?id=eq.1")
    genesis_val = res_state[0].get("genesis_time") if res_state else None
    
    if genesis_val is None:
        genesis = time.time()
        db_upsert("universe_state", {"id": 1, "age": 0.0, "genesis_time": genesis, "epoch": "Primordial Inflation"})
    else: 
        genesis = float(genesis_val)
        
    last_ai_tick = 0
    while True:
        try:
            age_gyr = calculate_dual_phase_age(genesis)
            if age_gyr < 0.001: epoch = "Primordial Inflation"
            elif age_gyr < 0.01: epoch = "Recombination & Decoupling"
            elif age_gyr < 0.1: epoch = "Pop-III Star Reionization"
            elif age_gyr < 1.0: epoch = "Galactic Disk Accretion"
            else: epoch = "Stellar & Deep Time Era"

            db_patch("universe_state", 1, {"age": age_gyr, "epoch": epoch, "genesis_time": genesis})
            
            # AI Cycle (45-60 seconds)
            now = time.time()
            if now - last_ai_tick >= random.uniform(45, 60):
                run_ai_cycle(age_gyr)
                last_ai_tick = now
        except Exception as e:
            log_error("MAIN LOOP", e)
            
        time.sleep(3)
