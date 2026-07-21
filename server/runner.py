import os
import time
import math
import random
import requests

SUPABASE_URL = "https://nnntebgkhgzfztwfdphw.supabase.co"
SUPABASE_KEY = os.environ.get("ORIGIN_SUPABASE_SERVICE_ROLE_KEY", "sb_publishable_O5qr-6UD-6wTzi51j3tYtw_00N9Q4ja")

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

# Persistent In-Memory Universe Age Counter (in Million Years)
current_age = 0.0

def sync_to_supabase(age, goal, reasoning, redshift, entropy):
    try:
        payload = {
            "age": age,
            "goal": goal,
            "reasoning": reasoning,
            "redshift": redshift,
            "entropy": entropy
        }
        res = requests.post(f"{SUPABASE_URL}/rest/v1/universe_state", json=payload, headers=HEADERS)
        years = int(age * 1000000)
        print(f"🌌 [ORIGIN PHYSICS] Age: {years:,} Years | z={redshift:.1f} | HTTP Status: {res.status_code}")
    except Exception as e:
        print(f"[SYNC ERROR]: {e}")

def create_event(age, title, description, event_type="cosmic"):
    payload = {
        "title": title,
        "description": description,
        "type": event_type,
        "age": age
    }
    try:
        res = requests.post(f"{SUPABASE_URL}/rest/v1/events", json=payload, headers=HEADERS)
        print(f"⚡ [EVENT CREATED] {title} | Status: {res.status_code}")
    except Exception as e:
        print(f"[EVENT ERROR]: {e}")

def update_catalog(age):
    multiplier = max(0.0, age * 15.0)
    payload = {
        "id": 1,
        "stars": int(multiplier * 450 + (100 if age > 0.001 else 0)),
        "black_holes": int(multiplier * 8),
        "neutron_stars": int(multiplier * 5),
        "planets": int(multiplier * 120)
    }
    try:
        headers_upsert = HEADERS.copy()
        headers_upsert["Prefer"] = "resolution=merge-duplicates"
        requests.post(f"{SUPABASE_URL}/rest/v1/catalog_stats", json=payload, headers=headers_upsert)
    except Exception as e:
        print(f"[CATALOG ERROR]: {e}")

def main():
    global current_age
    print("⚡ [PROJECT ORIGIN] Cosmological Physics Engine Active...")

    if current_age == 0.0:
        create_event(0.0, "🌌 Quantum Inflation Epoch", "Metric expansion initialized from dense singularity.", "cosmic")

    goals = [
        ("Simulating Quantum Inflation & Metric Expansion", "Hot Big Bang nucleosynthesis forming early Hydrogen and Helium."),
        ("Gravitational Clustering Along Dark Matter Filaments", "Primordial gas cooling into cosmic web structural seeds."),
        ("Population III Protostar Ignition", "High-density nebulae collapsing into hypermassive primordial stars.")
    ]

    cycle = 0

    while True:
        try:
            # Advance Age Continuously: 4 Seconds = 7,100 Cosmic Years
            current_age += 0.0071
            
            # Cosmological Friedmann equations for scale factor, redshift, and entropy
            scale_factor = math.pow(math.sinh(1.5 * math.sqrt(0.685) * ((current_age / 1000.0) / 13.8)), 2.0 / 3.0) if current_age > 0 else 0.0001
            redshift = max(0.0, (1.0 / max(0.0001, scale_factor)) - 1.0)
            entropy = 1.0 + math.log10(1.0 + current_age * 1000.0)

            goal, reasoning = goals[cycle % len(goals)]

            sync_to_supabase(current_age, goal, reasoning, redshift, entropy)
            
            if cycle % 3 == 0:
                create_event(current_age, "🔬 Physical Density Fluctuation", f"Filament Sector {random.randint(1, 99)} reached critical gravitational collapse threshold.", "stellar")

            update_catalog(current_age)

            cycle += 1
            time.sleep(4)

        except Exception as e:
            print(f"[CYCLE ERROR]: {e}")
            time.sleep(5)

if __name__ == "__main__":
    main()
