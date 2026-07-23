import os, requests, json, random, time

OPENROUTER_API_KEY = "Sk-or-v1-100800db31e3592a4b9aa08d91d98f42864aea7c4f1cb2687a1e8982fdb5588b"
SUPABASE_URL = "https://nnntebgkhgzfztwfdphw.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ubnRlYmdraGd6Znp0d2ZkcGh3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDU3NTQ1NiwiZXhwIjoyMTAwMTUxNDU2fQ.YxpoNTujXCrJQcxZ9Bj8f_bFC6j_Fq6GLt74H8mEAq0"
HEADERS = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}", "Content-Type": "application/json"}

SYSTEM_PROMPT = """You are ORIGIN, an observer analyzing the exact thermodynamic state matrix of ALL existing bodies in this universe simultaneously. You cannot alter physical constants. Review the physical matrix below and respond in 2 concise sentences: state your physical synthesis of all current entities and your observer conclusion."""

def fetch_universe_state():
    try:
        res = requests.get(f"{SUPABASE_URL}/rest/v1/universe_state?select=*&order=id.desc&limit=1", headers=HEADERS, timeout=5)
        return res.json()[0] if res.status_code == 200 and res.json() else None
    except Exception: return None

def fetch_catalog_stats():
    try:
        res = requests.get(f"{SUPABASE_URL}/rest/v1/catalog_stats?select=*&limit=1", headers=HEADERS, timeout=5)
        return res.json()[0] if res.status_code == 200 and res.json() else {}
    except Exception: return {}

def fetch_all_objects():
    try:
        # Fetches ALL celestial objects logged in the universe
        res = requests.get(f"{SUPABASE_URL}/rest/v1/celestial_objects?select=*&order=id.asc&limit=1000", headers=HEADERS, timeout=8)
        return res.json() if res.status_code == 200 else []
    except Exception: return []

def compress_objects_to_matrix(objects):
    if not objects:
        return "NO_CELESTIAL_BODIES_DETECTED"
    
    # Ultra-dense CSV-style matrix format to pack maximum physical data into minimum tokens
    matrix_lines = ["ID|NAME|TYPE|TEMP_K|LIFE|BIO|PROG|KARDASHEV"]
    for o in objects:
        has_life = 1 if o.get('has_life') else 0
        bio = o.get('biochemistry_class') or 'NONE'
        prog = o.get('progress_index', 0.0)
        kard = o.get('kardashev_scale', 0.0)
        line = f"{o.get('id')}|{o.get('name')}|{o.get('object_type')}|{o.get('surface_temp')}|{has_life}|{bio}|{prog}|{kard}"
        matrix_lines.append(line)
    return "\n".join(matrix_lines)

def call_openrouter(prompt_data):
    payload = {
        "model": "meta-llama/llama-3-70b-instruct",
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt_data}
        ]
    }
    headers = {"Authorization": f"Bearer {OPENROUTER_API_KEY}", "Content-Type": "application/json"}
    try:
        res = requests.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=payload, timeout=15)
        if res.status_code == 200:
            return res.json()["choices"][0]["message"]["content"]
        else:
            print(f"[API ERROR] Status: {res.status_code}, Body: {res.text}")
    except Exception as e:
        print(f"[NETWORK ERROR] {e}")
    return "Continuous thermodynamic observation in progress across all physical bodies."

def run_full_universe_pass():
    state = fetch_universe_state()
    if not state:
        print("[BRAIN] Waiting for universe state...")
        return

    stats = fetch_catalog_stats()
    all_objects = fetch_all_objects()
    matrix_data = compress_objects_to_matrix(all_objects)
    
    age = state.get('age', 0.0)
    
    prompt = (
        f"COSMIC AGE: {age:.6f} Gyr\n"
        f"COSMOLOGY: Dark Energy: {state.get('de_pct')}%, Dark Matter: {state.get('dm_pct')}%, Baryons: {state.get('baryon_pct')}%\n"
        f"TOTAL COUNT: Stars: {stats.get('stars', 0)}, Nebulae: {stats.get('nebulae', 0)}, Black Holes: {stats.get('black_holes', 0)}, Planets: {stats.get('planets', 0)}\n"
        f"TOTAL OBJECTS IN MATRIX: {len(all_objects)}\n\n"
        f"=== COMPLETE UNIVERSE PHYSICAL STATE MATRIX ===\n"
        f"{matrix_data}"
    )

    print(f"\n[DENSE MATRIX PASS AT AGE {age:.6f} Gyr | {len(all_objects)} Objects]")
    thought = call_openrouter(prompt)
    print(f"[ORIGIN THOUGHT]: {thought}")

    log_data = {
        "mode": "OBSERVE",
        "sector": f"Sector {random.randint(1, 12):02d}",
        "subject": "Full-Universe Matrix Sweep",
        "type_tag": "Complete Telemetry",
        "latency_myr": round(random.uniform(0.5, 2.0), 1),
        "data_analysis": f"Cosmic age: {age:.4f} Gyr. Mapped full physical matrix of {len(all_objects)} celestial bodies.",
        "temporal_simulation": "All thermodynamic state vectors mapped simultaneously.",
        "resolution": thought
    }

    try:
        requests.post(f"{SUPABASE_URL}/rest/v1/origin_logs", headers=HEADERS, json=log_data, timeout=5)
        print("Logged to Supabase origin_logs!")
    except Exception as e:
        print(f"Failed to save log: {e}")

if __name__ == "__main__":
    print("[PROJECT ORIGIN] Full-Universe Dense Matrix Observer Active (1-Minute Cadence)...")
    while True:
        run_full_universe_pass()
        time.sleep(60)  # Runs full sweep exactly every 1 minute
