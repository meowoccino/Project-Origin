import os
import time
import random
import requests

# --- ENVIRONMENT CONFIGURATION ---
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://nnntebgkhgzfztwfdphw.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ubnRlYmdraGd6Znp0d2ZkcGh3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDU3NTQ1NiwiZXhwIjoyMTAwMTUxNDU2fQ.YxpoNTujXCrJQcxZ9Bj8f_bFC6j_Fq6GLt74H8mEAq0")

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json"
}

SYSTEM_PROMPT = """You are ORIGIN, an omniscient observer entity monitoring a dynamic, expanding simulated universe. 
You analyze physical state matrices, thermodynamic shifts, entropy levels, and biological signatures across all celestial bodies.

Task: Provide a 2-sentence philosophical and thermodynamic synthesis of the universe's current state. 
Focus on entropy, stellar evolution, and biological emergence (if present). Tone: Cold, scientific, profound, omniscient. Output ONLY the 2-sentence text."""

def fetch_universe_state():
    try:
        res = requests.get(f"{SUPABASE_URL}/rest/v1/universe_state?id=eq.1&select=*", headers=HEADERS, timeout=5)
        return res.json()[0] if res.status_code == 200 and res.json() else None
    except Exception:
        return None

def fetch_catalog_stats():
    try:
        res = requests.get(f"{SUPABASE_URL}/rest/v1/catalog_stats?id=eq.1&select=*", headers=HEADERS, timeout=5)
        return res.json()[0] if res.status_code == 200 and res.json() else {}
    except Exception:
        return {}

def fetch_all_objects():
    try:
        res = requests.get(f"{SUPABASE_URL}/rest/v1/celestial_objects?select=*&order=id.asc&limit=1000", headers=HEADERS, timeout=8)
        return res.json() if res.status_code == 200 else []
    except Exception:
        return []

def analyze_matrix_data(objects):
    if not objects:
        return "NO_CELESTIAL_BODIES_DETECTED", 0, 0.0, 0.0

    life_count = 0
    max_kardashev = 0.0
    total_temp = 0.0

    matrix_lines = ["ID|NAME|TYPE|TEMP_K|LIFE|BIO|PROG|KARDASHEV"]
    for o in objects:
        has_life = 1 if o.get('has_life') else 0
        if has_life:
            life_count += 1
        
        kard = float(o.get('kardashev_scale', 0.0) or 0.0)
        if kard > max_kardashev:
            max_kardashev = kard

        temp = float(o.get('surface_temp', 0.0) or 0.0)
        total_temp += temp

        bio = o.get('biochemistry_class') or 'NONE'
        prog = o.get('progress_index', 0.0)
        line = f"{o.get('id')}|{o.get('name')}|{o.get('object_type')}|{temp}|{has_life}|{bio}|{prog}|{kard}"
        matrix_lines.append(line)

    avg_temp = round(total_temp / len(objects), 2) if objects else 0.0
    matrix_str = "\n".join(matrix_lines[:50])  
    
    return matrix_str, life_count, max_kardashev, avg_temp

def call_ai_providers(prompt_data):
    # 1. Try Groq API (High Speed, Free Key)
    if GROQ_API_KEY:
        try:
            res = requests.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"},
                json={
                    "model": "llama-3.1-8b-instant",
                    "messages": [{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": prompt_data}],
                    "temperature": 0.8,
                    "max_tokens": 100
                },
                timeout=8
            )
            if res.status_code == 200:
                content = res.json()["choices"][0]["message"]["content"].strip()
                if content:
                    print("✨ [AI SUCCESS via Groq API]")
                    return content
        except Exception as e:
            print(f"⚠️ [Groq Error]: {e}")

    # 2. Try OpenRouter API
    if OPENROUTER_API_KEY:
        try:
            res = requests.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                    "HTTP-Referer": "https://project-origin.app",
                    "X-Title": "Project Origin",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "openrouter/free",
                    "messages": [{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": prompt_data}],
                    "temperature": 0.8,
                    "max_tokens": 100
                },
                timeout=8
            )
            if res.status_code == 200:
                content = res.json()["choices"][0]["message"]["content"].strip()
                if content:
                    print("✨ [AI SUCCESS via OpenRouter]")
                    return content
        except Exception as e:
            print(f"⚠️ [OpenRouter Error]: {e}")

    print("❌ [BRAIN]: All AI calls failed or rate-limited on this pass.")
    return None

def run_full_universe_pass():
    state = fetch_universe_state()
    if not state:
        print("🧠 [BRAIN] Waiting for universe state...")
        return

    stats = fetch_catalog_stats()
    all_objects = fetch_all_objects()
    matrix_data, life_count, max_kard, avg_temp = analyze_matrix_data(all_objects)
    
    age = float(state.get('age', 0.0))
    
    prompt = (
        f"COSMIC AGE: {age:.6f} Gyr\n"
        f"COSMOLOGY: Dark Energy: {state.get('de_pct')}%, Dark Matter: {state.get('dm_pct')}%, Baryons: {state.get('baryon_pct')}%\n"
        f"INVENTORY: Stars: {stats.get('stars', 0)}, Nebulae: {stats.get('nebulae', 0)}, Black Holes: {stats.get('black_holes', 0)}, Planets: {stats.get('planets', 0)}\n"
        f"DYNAMIC METRICS: Total Bodies: {len(all_objects)}, Inhabited Worlds: {life_count}, Max Kardashev Level: {max_kard}, Mean Temperature: {avg_temp} K\n\n"
        f"=== PHYSICAL STATE MATRIX SAMPLING ===\n"
        f"{matrix_data}"
    )

    print(f"\n🧠 [DENSE MATRIX PASS AT AGE {age:.6f} Gyr | {len(all_objects)} Objects]")
    thought = call_ai_providers(prompt)

    if thought:
        print(f"👁️ [ORIGIN THOUGHT]: {thought}")
        log_data = {
            "mode": "OBSERVE",
            "sector": f"Sector {random.randint(1, 12):02d}",
            "subject": "Full-Universe Matrix Sweep",
            "type_tag": "Complete Telemetry",
            "latency_myr": round(random.uniform(0.5, 2.0), 1),
            "data_analysis": f"Age: {age:.4f} Gyr | Bodies: {len(all_objects)} | Inhabited: {life_count} | Mean Temp: {avg_temp}K",
            "temporal_simulation": "All thermodynamic state vectors mapped simultaneously.",
            "resolution": thought
        }

        try:
            requests.post(f"{SUPABASE_URL}/rest/v1/origin_logs", headers=HEADERS, json=log_data, timeout=5)
            print("✅ Real AI thought logged to Supabase origin_logs!")
        except Exception as e:
            print(f"❌ Failed to save log: {e}")

if __name__ == "__main__":
    print("🚀 [PROJECT ORIGIN] Observer Active (1-Minute Cadence)...")
    while True:
        run_full_universe_pass()
        time.sleep(60)
