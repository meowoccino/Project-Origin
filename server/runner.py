import os
import time
import random
import requests

SUPABASE_URL = "https://nnntebgkhgzfztwfdphw.supabase.co"
SERVICE_KEY = os.environ.get("ORIGIN_SUPABASE_SERVICE_ROLE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ubnRlYmdraGd6Znp0d2ZkcGh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTAwMDAwMDAsImV4cCI6MjAwMDAwMDAwMH0.placeholder")

HEADERS = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

INITIAL_BIG_BANG_EVENTS = [
    {"type": "cosmic", "title": "🌌 Quantum Inflation Epoch", "desc": "Metric expansion of space began from a dense hot singularity."},
    {"type": "cosmic", "title": "✨ Primordial Nucleosynthesis", "desc": "Protons and neutrons fused into early Hydrogen and Helium nuclei."},
    {"type": "cosmic", "title": "⚡ Cosmic Microwave Background", "desc": "Photons decoupled from matter, making the universe transparent."}
]

DYNAMIC_EVENTS = [
    {"type": "stellar", "title": "First Protostar Ignition", "desc": "Population III supermassive gas cloud collapsed into a luminous core."},
    {"type": "blackhole", "title": "Primordial Black Hole Collapse", "desc": "High-density quantum fluctuation collapsed directly into a black hole."},
    {"type": "cosmic", "title": "Dark Matter Filament Accretion", "desc": "Intergalactic gas streams aligned along cosmic web filaments."}
]

def reset_or_fetch_age():
    try:
        res = requests.get(f"{SUPABASE_URL}/rest/v1/universe_state?select=age&order=id.desc&limit=1", headers=HEADERS)
        if res.status_code == 200 and len(res.json()) > 0:
            return float(res.json()[0].get("age", 0.0))
    except Exception as e:
        print(f"[RECOVERY] Fetch error: {e}")
    return 0.0

def update_simulation_state(new_age, goal, reasoning):
    try:
        payload = {
            "age": new_age,
            "goal": goal,
            "reasoning": reasoning
        }
        res = requests.post(f"{SUPABASE_URL}/rest/v1/universe_state", json=payload, headers=HEADERS)
        print(f"[ORIGIN ENGINE] Age: {int(new_age * 1000000):,} Yrs | Status: {res.status_code}")
    except Exception as e:
        print(f"[ERROR] State write error: {e}")

def create_event(age, title=None, desc=None, event_type=None):
    if not title:
        tmpl = random.choice(DYNAMIC_EVENTS)
        title, desc, event_type = tmpl["title"], tmpl["desc"], tmpl["type"]

    payload = {
        "title": title,
        "description": desc,
        "type": event_type,
        "age": age
    }
    try:
        requests.post(f"{SUPABASE_URL}/rest/v1/events", json=payload, headers=HEADERS)
    except Exception as e:
        print(f"[ERROR] Event write error: {e}")

def update_catalog(age):
    # Scale object populations realistically with cosmic age
    multiplier = max(0.0, age * 15.0)
    payload = {
        "id": 1,
        "stars": int(multiplier * 450 + (100 if age > 0.1 else 0)),
        "black_holes": int(multiplier * 8),
        "neutron_stars": int(multiplier * 5),
        "planets": int(multiplier * 120)
    }
    try:
        headers_upsert = HEADERS.copy()
        headers_upsert["Prefer"] = "resolution=merge-duplicates"
        requests.post(f"{SUPABASE_URL}/rest/v1/catalog_stats", json=payload, headers=headers_upsert)
    except Exception as e:
        print(f"[ERROR] Catalog write error: {e}")

def main():
    print("⚡ [PROJECT ORIGIN] Primordial Cosmological Engine Started...")
    
    current_age = reset_or_fetch_age()

    # Log initial Big Bang event if starting at 0
    if current_age == 0.0:
        for init_e in INITIAL_BIG_BANG_EVENTS:
            create_event(0.0, init_e["title"], init_e["desc"], init_e["type"])

    goals = [
        ("Simulating Quantum Inflation & Metric Expansion", "Hot Big Bang nucleosynthesis forming hydrogen and helium."),
        ("Gravitational Clustering Along Dark Matter Filaments", "Primordial gas cooling into cosmic web structural seeds."),
        ("Population III Protostar Ignition", "High-density nebulae collapsing into hypermassive primordial stars.")
    ]

    cycle = 0

    while True:
        try:
            current_age += 0.005 # Advance by 5,000 Years per cycle
            
            goal, reasoning = goals[cycle % len(goals)]
            update_simulation_state(current_age, goal, reasoning)

            if cycle % 2 == 0:
                create_event(current_age)

            update_catalog(current_age)

            cycle += 1
            time.sleep(4)

        except Exception as e:
            print(f"[RECOVERY] Cycle error: {e}")
            time.sleep(5)

if __name__ == "__main__":
    main()
