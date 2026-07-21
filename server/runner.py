import os
import time
import random
import requests

# Load Environment Variables from Oracle Cloud environment
SUPABASE_URL = os.environ.get("ORIGIN_SUPABASE_URL", "https://nnntebgkhgzfztwfdphw.supabase.co")
SERVICE_KEY = os.environ.get("ORIGIN_SUPABASE_SERVICE_ROLE_KEY", "")
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")

HEADERS = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

EVENT_TYPES = ["blackhole", "stellar", "cosmic", "planetary"]

EVENT_TEMPLATES = [
    {"type": "blackhole", "title": "Black Hole Formed", "desc": "Object-{id} has collapsed under its own gravity into a stellar-mass black hole."},
    {"type": "stellar", "title": "Supernova Explosion", "desc": "Massive star Helion-{id} went supernova, seeding Sector {sector} with heavy metals."},
    {"type": "cosmic", "title": "Galaxy Cluster Fusion", "desc": "Gravitational pull brought Cluster-{id} into alignment with the central galaxy core."},
    {"type": "planetary", "title": "Proto-Planet Accretion", "desc": "Dust cloud in Sector {sector} condensed into a solid rocky protoplanet."}
]

def get_latest_state():
    try:
        res = requests.get(f"{SUPABASE_URL}/rest/v1/universe_state?select=*&order=id.desc&limit=1", headers=HEADERS)
        if res.status_code == 200 and len(res.json()) > 0:
            return res.json()[0]
    except Exception as e:
        print(f"[ORIGIN ERROR] Failed to fetch state: {e}")
    return {"id": 1, "age": 0.0, "goal": "Initialize primordial matter", "reasoning": "Starting universe simulation"}

def update_universe_state(new_age, goal, reasoning):
    try:
        payload = {
            "age": new_age,
            "goal": goal,
            "reasoning": reasoning
        }
        res = requests.post(f"{SUPABASE_URL}/rest/v1/universe_state", json=payload, headers=HEADERS)
        if res.status_code in [200, 201]:
            print(f"[ORIGIN AI] State Updated: Age = {new_age:.4f} Myr ({int(new_age * 1000000):,} Years)")
        else:
            print(f"[ORIGIN ERROR] State Update Failed ({res.status_code}): {res.text}")
    except Exception as e:
        print(f"[ORIGIN ERROR] Exception updating state: {e}")

def create_cosmic_event(age):
    template = random.choice(EVENT_TEMPLATES)
    obj_id = random.randint(10000, 99999)
    sector_id = random.randint(1, 99)
    
    title = template["title"]
    description = template["desc"].format(id=obj_id, sector=sector_id)
    event_type = template["type"]

    payload = {
        "title": title,
        "description": description,
        "type": event_type,
        "age": age
    }

    try:
        res = requests.post(f"{SUPABASE_URL}/rest/v1/events", json=payload, headers=HEADERS)
        if res.status_code in [200, 201]:
            print(f"[ORIGIN EVENT] Generated: {title} - {description}")
    except Exception as e:
        print(f"[ORIGIN ERROR] Failed to write event: {e}")

def update_catalog_stats(age):
    # Scale counts naturally with universe age
    base_multiplier = max(1.0, age * 10.0)
    stars = int(120000 + (base_multiplier * 450) + random.randint(-50, 100))
    black_holes = int(1000 + (base_multiplier * 8) + random.randint(-2, 5))
    neutron_stars = int(800 + (base_multiplier * 6) + random.randint(-2, 4))
    planets = int(15000 + (base_multiplier * 120) + random.randint(-20, 50))

    payload = {
        "id": 1,
        "stars": stars,
        "black_holes": black_holes,
        "neutron_stars": neutron_stars,
        "planets": planets
    }

    try:
        # Upsert catalog stats
        headers_upsert = HEADERS.copy()
        headers_upsert["Prefer"] = "resolution=merge-duplicates"
        res = requests.post(f"{SUPABASE_URL}/rest/v1/catalog_stats", json=payload, headers=headers_upsert)
        if res.status_code in [200, 201, 204]:
            print(f"[ORIGIN CATALOG] Stars: {stars:,} | Black Holes: {black_holes:,} | Planets: {planets:,}")
    except Exception as e:
        print(f"[ORIGIN ERROR] Failed to update catalog: {e}")

def main():
    print("⚡ [PROJECT ORIGIN] AI Architect Multi-Table Runner Initiated...")
    
    goals = [
        ("Allowing gravitational clustering to unfold", "Monitoring the formation of the first cosmic filaments."),
        ("Increasing metallicity in central galactic cores", "Accelerating stellar nucleosynthesis to form heavy elements."),
        ("Stabilizing planetary orbits in Sector 12", "Creating conditions suitable for complex chemical structures."),
        ("Observing supermassive black hole accretion", "Measuring energy output and radiation pressure on surrounding nebulae.")
    ]

    cycle_count = 0

    while True:
        try:
            state = get_latest_state()
            current_age = float(state.get("age", 0.0))
            
            # Tick age forward by ~0.005 Myr (5,000 Years) per cycle
            new_age = current_age + 0.005
            
            goal_tuple = goals[cycle_count % len(goals)]
            
            # Update state, events, and catalog tables
            update_universe_state(new_age, goal_tuple[0], goal_tuple[1])
            
            # Generate an event every 2 cycles
            if cycle_count % 2 == 0:
                create_cosmic_event(new_age)
                
            # Update catalog counts every cycle
            update_catalog_stats(new_age)

            cycle_count += 1
            time.sleep(4)  # Cycle runs every 4 seconds

        except Exception as e:
            print(f"[ORIGIN RUNNER CRASH PREVENTED] {e}")
            time.sleep(5)

if __name__ == "__main__":
    main()
