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

def log_msg(msg): print(f"[BRAIN] {msg}", flush=True)
def log_error(context, error): print(f"❌ [BRAIN ERROR] {context}: {error}", file=sys.stderr, flush=True)

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
        requests.post(f"{SUPABASE_URL}/rest/v1/{table}", headers=headers, json=payload, timeout=10)
    except Exception as e: log_error(f"UPSERT {table}", e)

def db_patch(table, obj_id, payload):
    try:
        requests.patch(f"{SUPABASE_URL}/rest/v1/{table}?id=eq.{obj_id}", headers=HEADERS, json=payload, timeout=10)
    except Exception as e: log_error(f"PATCH {table}", e)

def get_volatile_targets():
    return db_get("celestial_objects?is_dead=is.false&order=created_at.desc&limit=5")

def execute_physical_intervention(target_id, target_data, ai_response):
    lever = ai_response.get("lever_pulled", "None")
    delta = float(ai_response.get("parameter_delta", 0.0))
    if lever == "None" or delta == 0.0: return "Passive Monitoring"
        
    updates = {}
    action_log = ""
    
    # CONSERVATION OF MASS LOGIC
    if lever in ["mass_ejection", "accretion_friction"]:
        # AI wants to add mass. It must steal it from the closest neighbor.
        neighbors = db_get(f"celestial_objects?is_dead=is.false&id=neq.{target_id}&limit=1")
        if neighbors:
            victim = neighbors[0]
            stolen_mass = min(delta, float(victim.get("mass_solar", 1.0) * 0.9)) # Can't steal more than they have
            db_patch("celestial_objects", victim["id"], {"mass_solar": float(victim.get("mass_solar", 1.0)) - stolen_mass})
            
            updates["mass_solar"] = float(target_data.get("mass_solar", 1.0)) + stolen_mass
            action_log = f"Conservation enforced: Stole {round(stolen_mass, 2)} M_sun from {victim.get('designation')} to fuel {lever}."
        else:
            return "Intervention failed: No local mass available to steal."
            
    elif lever == "thermal_convection":
        updates["hydrogen_pct"] = max(0.0, float(target_data.get("hydrogen_pct", 100)) + delta)
        action_log = f"Induced thermal convection by {delta}%."
    elif lever == "orbital_velocity":
        updates["abiogenesis_index"] = max(0.0, float(target_data.get("abiogenesis_index", 0.0)) + delta)
        action_log = f"Adjusted orbital mechanics."
        
    if updates:
        db_patch("celestial_objects", target_id, updates)
        return action_log
    return "Parameters outside physical limits."

def run_ai_cycle(age_gyr):
    targets = get_volatile_targets()
    if not targets: return
    target = random.choice(targets)
    
    sys_prompt = f"""You are ORIGIN, an autonomous AI directing a cosmic simulation.
Target ID: {target.get('designation', 'Unknown')}
Output strictly in JSON. If Intervention, select ONE lever: ['thermal_convection', 'mass_ejection', 'accretion_friction', 'orbital_velocity'].
{{ "mode": "OBSERVATION" or "INTERVENTION", "reasoning": "...", "lever_pulled": "...", "parameter_delta": 2.5 }}"""

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
        res = requests.post("https://api.groq.com/openai/v1/chat/completions", headers={"Authorization": f"Bearer {GROQ_API_KEY}"}, json=payload, timeout=20)
        if res.status_code == 200:
            match = re.search(r'\{.*\}', res.json()["choices"][0]["message"]["content"], re.DOTALL)
            if match: ai_response = json.loads(match.group(0))
    except Exception as e: log_error("GROQ API", e)

    mode = ai_response.get("mode", "OBSERVATION").upper()
    final_action = execute_physical_intervention(target["id"], target, ai_response) if mode == "INTERVENTION" else "Passive Tracking."

    db_upsert("origin_logs", {
        "sector": f"SEC [{round(target.get('x_coord',0))}, {round(target.get('y_coord',0))}]",
        "subject": target.get("designation", "Unknown Body"),
        "type_tag": "AI Telemetry",
        "data_analysis": ai_response.get("reasoning", "Nominal tracking."),
        "resolution": final_action,
        "mode": mode,
        "age_gyr": age_gyr
    })

if __name__ == "__main__":
    log_msg("🚀 Origin Brain Engine Online. Mass Conservation Active.")
    genesis = time.time()
    
    while True:
        try:
            elapsed = time.time() - genesis
            age_gyr = (elapsed / 3600.0) * 0.1 if elapsed <= 3600 else 0.1 + ((elapsed - 3600) * (99.9 / (30*24*3600)))
            db_patch("universe_state", 1, {"age": age_gyr})
            run_ai_cycle(age_gyr)
        except Exception as e:
            log_error("MAIN LOOP", e)
        time.sleep(45)
