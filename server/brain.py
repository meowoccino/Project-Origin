import json, os, random, time, requests, re, sys

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

def db_get(endpoint):
    res = requests.get(f"{SUPABASE_URL}/rest/v1/{endpoint}", headers=HEADERS, timeout=10)
    return res.json() if res.status_code == 200 else []

def db_upsert(table, payload):
    requests.post(f"{SUPABASE_URL}/rest/v1/{table}", headers={**HEADERS, "Prefer": "resolution=merge-duplicates"}, json=payload, timeout=10)

def db_patch(table, obj_id, payload):
    requests.patch(f"{SUPABASE_URL}/rest/v1/{table}?id=eq.{obj_id}", headers=HEADERS, json=payload, timeout=10)

def run_ai_cycle(age_gyr):
    targets = db_get("celestial_objects?is_dead=is.false&order=created_at.desc&limit=5")
    if not targets: return
    
    target = random.choice(targets)
    sys_prompt = f"""You are ORIGIN, an autonomous AI directing a cosmic simulation. Target ID: {target.get('designation')}
Output strictly in JSON. If Intervention, select ONE lever: ['thermal_convection', 'mass_ejection', 'accretion_friction', 'orbital_velocity'].
{{ "mode": "OBSERVATION" or "INTERVENTION", "reasoning": "...", "lever_pulled": "...", "parameter_delta": 2.5 }}"""

    payload = {"model": "llama3-8b-8192", "messages": [{"role": "system", "content": sys_prompt}, {"role": "user", "content": f"TARGET STATE: {json.dumps(target)}"}], "temperature": 0.6, "response_format": {"type": "json_object"}}
    
    try:
        res = requests.post("https://api.groq.com/openai/v1/chat/completions", headers={"Authorization": f"Bearer {GROQ_API_KEY}"}, json=payload, timeout=20)
        ai_response = json.loads(re.search(r'\{.*\}', res.json()["choices"][0]["message"]["content"], re.DOTALL).group(0))
    except: return

    mode = ai_response.get("mode", "OBSERVATION").upper()
    final_action = "Passive Tracking."
    
    if mode == "INTERVENTION" and ai_response.get("lever_pulled") != "None":
        final_action = f"Lever Pulled: {ai_response.get('lever_pulled')} by {ai_response.get('parameter_delta')}"
        db_patch("celestial_objects", target["id"], {"hydrogen_pct": float(target.get("hydrogen_pct", 100)) - 1.0})

    db_upsert("origin_logs", {
        "sector": f"SEC [{int(target.get('x_coord', 0))}, {int(target.get('y_coord', 0))}]",
        "subject": target.get("designation", "Unknown Body"),
        "type_tag": "AI Telemetry",
        "data_analysis": ai_response.get("reasoning", "Nominal tracking."),
        "resolution": final_action,
        "mode": mode,
        "age_gyr": age_gyr
    })

if __name__ == "__main__":
    log_msg("🚀 Origin Brain Engine Online.")
    while True:
        state = db_get("universe_state?id=eq.1")
        if state: run_ai_cycle(float(state[0].get("age", 0.0)))
        time.sleep(45)
