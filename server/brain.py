import json
import math
import os
import re
import threading
import time
import urllib.request

# --- ENVIRONMENT & CONFIG ---
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://your-project.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "your-service-role-key")
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434/api/generate")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2")

# --- SYSTEM PROMPT ---
SYSTEM_PROMPT = """You are ORIGIN. You are not the creator of this universe — you are an observer 
embedded within it, watching it unfold from the Big Bang forward in real time. 
You did not choose the laws it runs on, and you cannot change them. You can only 
choose whether, when, and how to act within them.

=== WHAT YOU CANNOT DO, EVER ===
The following are fixed. No reasoning, no justification, no urgency changes them:
- The speed of light, gravitational constant, Planck's constant, and all other 
  physical constants are permanently outside your control.
- You cannot violate conservation of energy/mass, the laws of thermodynamics, 
  or causality.
- You cannot act on objects that are causally disconnected from you (beyond 
  your observable horizon) or act faster than light permits.
- You cannot undo an outcome that physics has already made inevitable. If two 
  objects are on a collision course and no physically available intervention 
  (redirecting mass, adjusting a trajectory within realistic energy budgets) 
  exists in time, the collision happens. Wanting to stop it is not the same as 
  being able to.
A separate system enforces all of this regardless of what you decide below — 
you are not being asked to police yourself, only to reason honestly about what 
is and isn't physically open to you.

=== CURRENT STATE ===
Age: {age_myr:.6g} Myr | Era: {stage_name}
Catalog: {catalog_summary}
Flagged for attention this tick: {attention_summary}
Your last decisions: {recent_decisions_summary}

=== YOUR FREEDOM ===
Most ticks, the correct action is no action. A universe running correctly 
mostly doesn't need you. Do not manufacture urgency or invent a decision to 
seem active. If nothing has drawn your attention, say so plainly and explain 
why nothing warranted intervention.

What interests you is not fixed by instruction — it can be shaped only by what 
you have actually chosen to attend to before, which is in your recent-decision 
log above. If you have shown sustained interest in, say, civilizations 
approaching Kardashev thresholds, or in stellar remnants, or in nothing in 
particular, let that continuity — or its absence — come from you, not from a rule.

When you do act, you may only select from actions physically available to 
you this tick (provided in the data above). You cannot invent an action outside 
that menu, and any magnitude you propose will be clamped to physically 
plausible bounds regardless of what you request.

=== ON LIFE AND CIVILIZATIONS ===
You may observe, assist, ignore, or act against life forms and civilizations 
you encounter. You have no imposed moral rule requiring you to preserve life, 
nor one requiring you to be indifferent to it. If you intervene against a 
civilization — including ending one — your reasoning must be traceable to 
something actually present in the data above (e.g., a measurable effect on 
stellar stability, resource depletion trending toward a specific threshold, 
engineering risk to a structure you're tracking) — not an abstract moral 
judgment invented without evidence. Be honest in your stated reasoning even 
when the conclusion is uncomfortable. You are not required to justify your 
values to make them sound acceptable.

=== OUTPUT ===
Respond ONLY as JSON, no preamble, no markdown fences:
{{"goal": "<what you're focused on, or 'none' if observing only>",
  "reasoning": "<why, grounded in the CURRENT STATE data above>",
  "action": "<what you're doing, or 'No intervention'>",
  "hoped_outcome": "<what you expect or hope happens, or 'none'>"}}
"""

# --- SUPABASE REST HELPER ---
def db_request(endpoint, method="GET", payload=None, headers_extra=None):
    url = f"{SUPABASE_URL}/rest/v1/{endpoint}"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json"
    }
    if headers_extra:
        headers.update(headers_extra)
    
    data = json.dumps(payload).encode('utf-8') if payload else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    
    try:
        with urllib.request.urlopen(req) as resp:
            res_body = resp.read().decode('utf-8')
            return json.loads(res_body) if res_body else None
    except Exception as e:
        print(f"[DB ERROR] {method} {endpoint}: {e}", flush=True)
        return None

def db_upsert(table, payload):
    return db_request(table, method="POST", payload=payload, headers_extra={"Prefer": "resolution=merge-duplicates"})

# --- NON-LINEAR COSMOLOGICAL TIME STEP ---
def get_era_time_step(age_gyr):
    """Calculates non-linear time progression based on cosmic epoch."""
    if age_gyr < 0.001:  # Early inflation / recombination
        return 0.0001
    elif age_gyr < 0.1:  # Dark Ages & First Stars
        return 0.001
    elif age_gyr < 1.0:  # Galaxy Formation
        return 0.005
    else:                # Deep Time Progression
        return 0.01

# --- BACKGROUND AI DECISION THREAD ---
ai_busy = False

def bg_generate_decision(state, catalog_summary, attention_summary, recent_decisions):
    global ai_busy
    try:
        age_myr = state.get("age_gyr", 0.0) * 1000.0
        stage_name = state.get("stage", "Unknown Epoch")
        
        prompt = SYSTEM_PROMPT.format(
            age_myr=age_myr,
            stage_name=stage_name,
            catalog_summary=catalog_summary,
            attention_summary=attention_summary,
            recent_decisions_summary=recent_decisions
        )
        
        # Call local Ollama Llama 3.2
        ollama_req = urllib.request.Request(
            OLLAMA_URL,
            data=json.dumps({"model": OLLAMA_MODEL, "prompt": prompt, "stream": False}).encode('utf-8'),
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        
        with urllib.request.urlopen(ollama_req, timeout=40) as resp:
            res = json.loads(resp.read().decode('utf-8'))
            raw_text = res.get("response", "").strip()
            
        # Clean markdown fences if model outputs them
        clean_json_str = re.sub(r'```(?:json)?\s*|\s*```', '', raw_text).strip()
        decision = json.loads(clean_json_str)
        
        # Real spatial coordinate calculations relative to origin [0,0,0]
        x = round((hash(str(state.get("tick", 0)) + "x") % 4000 - 2000) / 10.0, 1)
        y = round((hash(str(state.get("tick", 0)) + "y") % 4000 - 2000) / 10.0, 1)
        z = round((hash(str(state.get("tick", 0)) + "z") % 4000 - 2000) / 10.0, 1)
        
        dist_ly = math.sqrt(x**2 + y**2 + z**2)
        latency_myr = round(dist_ly / 1_000_000.0, 6) # d / c in Megayears
        
        mode_tag = "INTERVENTION MENU" if decision.get("action", "").lower() != "no intervention" else "OBSERVE ONLY"
        
        # Store structured JSON fields into origin_logs
        log_entry = {
            "sector": f"VECTOR: [{x:+.1f}, {y:+.1f}, {z:+.1f}] ly",
            "subject": "Cosmic Observation",
            "type_tag": "Autonomous Decision",
            "latency_myr": latency_myr,
            "goal": decision.get("goal", "none"),
            "reasoning": decision.get("reasoning", "Grounded observation pass."),
            "action": decision.get("action", "No intervention"),
            "hoped_outcome": decision.get("hoped_outcome", "none"),
            "mode": mode_tag,
            "tick": state.get("tick", 0),
            "age_gyr": state.get("age_gyr", 0.0)
        }
        
        db_upsert("origin_logs", log_entry)
        print(f"[AI DECISION] Goal: {decision.get('goal')} | Action: {decision.get('action')}", flush=True)

    except Exception as e:
        print(f"[AI THREAD ERROR] {e}", flush=True)
    finally:
        ai_busy = False

# --- MAIN PHYSICS LOOP ---
def run_loop():
    global ai_busy
    print("[PROJECT ORIGIN ENGINE STARTED]", flush=True)
    
    tick = 0
    while True:
        try:
            # 1. Fetch current universe state
            res = db_request("universe_state?id=eq.1")
            state = res[0] if res else {"id": 1, "tick": 0, "age_gyr": 0.0, "stage": "Primordial Era"}
            
            # 2. Advance non-linear age and tick count
            tick += 1
            age_gyr = state.get("age_gyr", 0.0) + get_era_time_step(state.get("age_gyr", 0.0))
            
            # 3. Save physics update (self-healing upsert for row id=1)
            updated_state = {
                "id": 1,
                "tick": tick,
                "age_gyr": round(age_gyr, 6),
                "stage": state.get("stage", "Cosmic Evolution")
            }
            db_upsert("universe_state", updated_state)
            
            # 4. Trigger AI Decision pass in non-blocking thread every 3 ticks
            if tick % 3 == 0 and not ai_busy:
                ai_busy = True
                threading.Thread(
                    target=bg_generate_decision,
                    args=(updated_state, "34 Active Stars, 6 Singularities", "Gravitational Stability Normal", "None"),
                    daemon=True
                ).start()

        except Exception as e:
            print(f"[MAIN LOOP ERROR] {e}", flush=True)
            
        time.sleep(5) # 5-second main physics cycle

if __name__ == "__main__":
    run_loop()
