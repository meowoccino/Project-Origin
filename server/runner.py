import os
import time
import random
import requests

SUPABASE_URL = os.environ.get("ORIGIN_SUPABASE_URL", "https://nnntebgkhgzfztwfdphw.supabase.co")
SERVICE_KEY = os.environ.get("ORIGIN_SUPABASE_SERVICE_ROLE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ubnRlYmdraGd6Znp0d2ZkcGh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTAwMDAwMDAsImV4cCI6MjAwMDAwMDAwMH0.placeholder")

HEADERS = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

EVENT_TEMPLATES = [
    {"type": "blackhole", "title": "Stellar Black Hole Collapse", "desc": "Massive star surpassed Chandrasekhar limit and collapsed into a singularity."},
    {"type": "stellar", "title": "Core-Collapse Supernova", "desc": "Iron nucleosynthesis triggered core shockwave, dispersing heavy elements into the ISM."},
    {"type": "cosmic", "title": "Baryonic Filament Alignment", "desc": "Intergalactic gas streams collapsed along dark matter filaments."},
    {"type": "planetary", "title": "Protoplanetary Disk Accretion", "desc": "Dust grains coalesced into planetesimal seeds within a stable circumstellar zone."}
]

def update_simulation_state(new_age, goal, reasoning, redshift, entropy):
    try:
        payload = {
            "age": new_age,
            "goal": goal,
            "reasoning": reasoning,
            "redshift": redshift,
            "entropy": entropy
        }
        res = requests.post(f"{SUPABASE_URL}/rest/v1/universe_state", json=payload, headers=HEADERS)
        print(f"[ORIGIN PHYSICS] Age: {int(new_age * 1000000):,} Yrs | Redshift: z={redshift:.1f} | Entropy: {entropy:.4f} | Status: {res.status_code}")
    except Exception as e:
        print(f"[ERROR] State write failed: {e}")

def create_event(age):
    template = random.choice(EVENT_TEMPLATES)
    payload = {
        "title": template["title"],
        "description": template["desc"],
        "type": template["type"],
        "age": age
    }
    try:
        requests.post(f"{SUPABASE_URL}/rest/v1/events", json=payload, headers=HEADERS)
    except Exception as e:
        print(f"[ERROR] Event write failed: {e}")

def update_catalog(age):
    multiplier = max(1.0, age * 12.0)
    payload = {
        "id": 1,
        "stars": int(150000 + (multiplier * 500) + random.randint(-100, 100)),
        "black_holes": int(1200 + (multiplier * 10) + random.randint(-2, 5)),
        "neutron_stars": int(900 + (multiplier * 7) + random.randint(-2, 4)),
        "planets": int(18000 + (multiplier * 150) + random.randint(-30, 50))
    }
    try:
        headers_upsert = HEADERS.copy()
        headers_upsert["Prefer"] = "resolution=merge-duplicates"
        requests.post(f"{SUPABASE_URL}/rest/v1/catalog_stats", json=payload, headers=headers_upsert)
    except Exception as e:
        print(f"[ERROR] Catalog write failed: {e}")

def main():
    print("⚡ [PROJECT ORIGIN] Astrophysical Physics Engine Active...")
    
    physics_goals = [
        ("Simulating Dark Matter Filament Accretion", "Gravitational potential wells guiding baryonic matter aggregation."),
        ("Calculating Stellar Nucleosynthesis Yields", "Modeling heavy metal enrichment across Population II stellar clusters."),
        ("Evaluating Hydrodynamic Disk Stability", "Resolving angular momentum distribution in protogalactic structures.")
    ]

    cycle = 0

    while True:
        try:
            res = requests.get(f"{SUPABASE_URL}/rest/v1/universe_state?select=age&order=id.desc&limit=1", headers=HEADERS)
            current_age = 0.0
            if res.status_code == 200 and len(res.json()) > 0:
                current_age = float(res.json()[0].get("age", 0.0))

            new_age = current_age + 0.005
            
            redshift = max(0.0, 1100.0 / (1.0 + (new_age * 5.0)))
            entropy = 1.0 + (new_age * 0.15)
            
            goal, reasoning = physics_goals[cycle % len(physics_goals)]

            update_simulation_state(new_age, goal, reasoning, redshift, entropy)
            
            if cycle % 2 == 0:
                create_event(new_age)

            update_catalog(new_age)

            cycle += 1
            time.sleep(4)

        except Exception as e:
            print(f"[RECOVERY] Cycle error: {e}")
            time.sleep(5)

if __name__ == "__main__":
    main()
