import json, math, os, random, threading, time, urllib.request

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://nnntebgkhgzfztwfdphw.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "PLACEHOLDER_KEY")

# Groq API Configuration
GROQ_API_KEY = "Gsk_BoHuKcn7ydROVRYv9hXkWGdyb3FYwhTH3LHNVcO9CiPQ20qoYIV6"
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama3-8b-8192"

SYSTEM_PROMPT = """You are ORIGIN, an autonomous AI monitoring a cosmic simulation. 
Analyze the provided cosmic data. You must output your decision in STRICT JSON format. 
Choose "OBSERVATION" if the system is stable, or "INTERVENTION" to alter a physical parameter.
Format exactly like this:
{
  "mode": "OBSERVATION" or "INTERVENTION",
  "goal": "Brief goal description",
  "reasoning": "Scientific reasoning using the exact data provided",
  "action": "Specific physical adjustment or 'Passive Monitoring'",
  "calculated_outcome": "Expected physical result"
}"""

# Analytics Tracker for the 24-Hour Summary
daily_stats = {
    "observations": 0,
    "interventions": 0,
    "last_summary_time": time.time(),
    "recent_actions": []
}

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
        with urllib.request.urlopen(req, timeout=5):
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

def generate_daily_summary(age_gyr):
    global daily_stats
    total = daily_stats["observations"] + daily_stats["interventions"]
    if total == 0: return

    obs_pct = round((daily_stats["observations"] / total) * 100)
    int_pct = round((daily_stats["interventions"] / total) * 100)
    
    unique_actions = list(set(daily_stats["recent_actions"]))
    action_str = ", ".join(unique_actions[:3]) if unique_actions else "Passive progression"

    summary_text = (f"Over the last 24-hour cycle, ORIGIN spent {obs_pct}% of its time passively observing "
                    f"and {int_pct}% intervening. Primary focus areas included: {action_str}.")

    summary_entry = {
        "sector": "MACRO-SYSTEM",
        "subject": "24-Hour Activity Cycle",
        "type_tag": "Daily Summary",
        "latency_myr": 0.0,
        "data_analysis": f"Cycle Review at Age: {age_gyr:.4f} Gyr",
        "temporal_simulation": f"Total Actions Evaluated: {total}",
        "resolution": summary_text,
        "goal": "Assess AI autonomy patterns",
        "reasoning": "Periodic system analytics log.",
        "action": "Summary Generation",
        "hoped_outcome": "Data aggregation",
        "mode": "OBSERVATION",
        "age_gyr": age_gyr,
        "tick": int(age_gyr * 100000)
    }
    db_upsert("origin_logs", summary_entry)
    print("\n📊 [DAILY SUMMARY GENERATED AND LOGGED]\n", flush=True)
    
    daily_stats = {"observations": 0, "interventions": 0, "last_summary_time": time.time(), "recent_actions": []}

def bg_generate_decision(state):
    global ai_busy, daily_stats
    try:
        age_gyr = state.get("age", 0.0)
        epoch_name = state.get("epoch", "Cosmic Era")
        target_id = f"Object #{random.randint(1000, 9999)}"
        
        prompt = f"COSMIC AGE: {age_gyr:.6f} Gyr. ERA: {epoch_name}. TARGET: {target_id}. Provide JSON decision."
        
        payload = {
            "model": GROQ_MODEL,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.7
        }
        
        ai_response = {}
        try:
            req = urllib.request.Request(GROQ_URL, data=json.dumps(payload).encode('utf-8'), method="POST")
            req.add_header("Authorization", f"Bearer {GROQ_API_KEY}")
            req.add_header("Content-Type", "application/json")
            
            with urllib.request.urlopen(req, timeout=10) as resp:
                res = json.loads(resp.read().decode('utf-8'))
                raw_text = res["choices"][0]["message"]["content"].strip()
                ai_response = json.loads(raw_text)
        except Exception as e:
            print(f"[GROQ API ERROR] {e}", flush=True)

        mode = ai_response.get("mode", "OBSERVATION").upper()
        goal = ai_response.get("goal", "Maintain thermodynamic balance")
        reasoning = ai_response.get("reasoning", "Metrics align with standard cosmological models.")
        action = ai_response.get("action", "Passive Monitoring")
        outcome = ai_response.get("calculated_outcome", "Stable evolution expected.")

        if mode == "INTERVENTION":
            daily_stats["interventions"] += 1
            daily_stats["recent_actions"].append(action)
        else:
            daily_stats["observations"] += 1

        x = round((hash(str(age_gyr) + "x") % 4000 - 2000) / 10.0, 1)
        y = round((hash(str(age_gyr) + "y") % 4000 - 2000) / 10.0, 1)
        z = round((hash(str(age_gyr) + "z") % 4000 - 2000) / 10.0, 1)
        dist_ly = math.sqrt(x**2 + y**2 + z**2)
        latency_myr = round(dist_ly / 1_000_000.0, 6)

        log_entry = {
            "sector": f"VECTOR: [{x:+.1f}, {y:+.1f}, {z:+.1f}] ly",
            "subject": target_id,
            "type_tag": "AI Telemetry",
            "latency_myr": latency_myr,
            "data_analysis": reasoning,
            "temporal_simulation": outcome,
            "resolution": action,
            "goal": goal,
            "reasoning": reasoning,
            "action": action,
            "hoped_outcome": outcome,
            "mode": mode,
            "age_gyr": age_gyr,
            "tick": int(age_gyr * 100000)
        }
        db_upsert("origin_logs", log_entry)
        print(f"[{mode}] Action logged for {target_id} at Age: {age_gyr} Gyr", flush=True)

        # Trigger summary if 24 hours (86400 seconds) have passed
        if time.time() - daily_stats["last_summary_time"] > 86400:
            generate_daily_summary(age_gyr)

    except Exception as e:
        print(f"[AI THREAD ERROR] {e}", flush=True)
    finally:
        ai_busy = False

def run_loop():
    global ai_busy
    print("[PROJECT ORIGIN ENGINE STARTED - GROQ API]", flush=True)
    
    res_state = db_request("universe_state?id=eq.1")
    if not res_state:
        db_upsert("universe_state", {
            "id": 1, "age": 0.0, "epoch": "Inflation Era", "redshift": 1100.0,
            "entropy": 0.001, "de_pct": 68.3, "dm_pct": 26.8, "baryon_pct": 4.9,
            "goal": "Cosmic Genesis", "reasoning": "Big Bang initialized."
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

            if tick % 15 == 0 and not ai_busy: 
                ai_busy = True
                threading.Thread(target=bg_generate_decision, args=(updated_state,), daemon=True).start()

        except Exception as e:
            print(f"[MAIN LOOP ERROR] {e}", flush=True)
            
        time.sleep(3)

if __name__ == "__main__":
    run_loop()
