import os
import time
import random
import requests

SUPABASE_URL = os.environ.get("ORIGIN_SUPABASE_URL", "https://nnntebgkhgzfztwfdphw.supabase.co")
SERVICE_KEY = os.environ.get("ORIGIN_SUPABASE_SERVICE_ROLE_KEY", "")

HEADERS = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

EVENT_TEMPLATES = [
    {"type": "blackhole", "title": "Black Hole Formed", "desc": "Object-{id} collapsed under gravity into a black hole."},
    {"type": "stellar", "title": "Supernova Explosion", "desc": "Star Helion-{id} went supernova in Sector {sector}."},
    {"type": "cosmic", "title": "Filament Alignment", "desc": "Cluster-{id} fused into cosmic web filament."},
    {"type": "planetary", "title": "Protoplanet Accretion", "desc": "Dust in Sector {sector} formed a new terrestrial world."}
]

def get_latest_state():
    try:
        res = requests.get(f"{SUPABASE_URL}/rest/v1/universe_state?select=*&order=id.desc&limit=1", headers=HEADERS)
        if res.status_code == 200 and len(res.json()) > 0:
            return res.json()[0]
    except Exception as e:
        print(f"[ORIGIN ERROR] State fetch failed: {e}")
    return {"id": 1, "age": 0.0, "goal": "Initialize matter", "reasoning": "Starting simulation"}

def check_pending_user_commands():
    try:
        res = requests.get(f"{SUPABASE_URL}/rest/v1/user_commands?status=eq.pending&order=id.asc&limit=1", headers=HEADERS)
        if res.status_code == 200 and len(res.json()) > 0:
            cmd = res.json()[0]
            # Mark command as processed
            requests.patch(
                f"{SUPABASE_URL}/rest/v1/user_commands?id=eq.{cmd['id']}",
                json={"status": "processed"},
                headers=HEADERS
            )
            return cmd["command"]
    except Exception as e:
        print(f"[ORIGIN ERROR] User commands check failed: {e}")
    return None

def update_universe_state(new_age, goal, reasoning):
    try:
        payload = {"age": new_age, "goal": goal, "reasoning": reasoning}
        requests.post(f"{SUPABASE_URL}/rest/v1/universe_state", json=payload, headers=HEADERS)
        print(f"[ORIGIN AI] State Updated: Age = {int(new_age * 1000000):,} Years")
    except Exception as e:
        print(f"[ORIGIN ERROR] Exception updating state: {e}")

def create_cosmic_event(age, title=None, description=None, event_type=None):
    if not title:
        template = random.choice(EVENT_TEMPLATES)
        obj_id = random.randint(10000, 99999)
        sector_id = random.randint(1, 99)
        title = template["title"]
        description = template["desc"].format(id=obj_id, sector=sector_id)
        event_type = template["type"]

    payload = {
        "title": title,
        "description": description,
        "type": event_type or "cosmic",
        "age": age
    }

    try:
        requests.post(f"{SUPABASE_URL}/rest/v1/events", json=payload, headers=HEADERS)
        print(f"[ORIGIN EVENT] {title}: {description}")
    except Exception as e:
        print(f"[ORIGIN ERROR] Event write failed: {e}")

def update_catalog_stats(age):
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
        headers_upsert = HEADERS.copy()
        headers_upsert["Prefer"] = "resolution=merge-duplicates"
        requests.post(f"{SUPABASE_URL}/rest/v1/catalog_stats", json=payload, headers=headers_upsert)
    except Exception as e:
        print(f"[ORIGIN ERROR] Catalog write failed: {e}")

def main():
    print("⚡ [PROJECT ORIGIN] Interactive AI Architect Initiated...")
    
    default_goals = [
        ("Gravitational clustering unfolding", "Monitoring formation of cosmic filaments."),
        ("Increasing metallicity in galactic cores", "Accelerating stellar nucleosynthesis."),
        ("Stabilizing planetary orbits", "Fostering prebiotic molecular stability.")
    ]

    cycle_count = 0

    while True:
        try:
            state = get_latest_state()
            current_age = float(state.get("age", 0.0))
            new_age = current_age + 0.005

            # Check if a visitor sent a God Directive!
            user_cmd = check_pending_user_commands()

            if user_cmd:
                print(f"⚡ [GOD DIRECTIVE RECEIVED]: {user_cmd}")
                goal = f"Executing User Directive: '{user_cmd}'"
                reasoning = "High-priority observer intervention overriding autonomous cosmological state."
                
                # Immediately publish event acknowledging directive
                create_cosmic_event(
                    new_age, 
                    title="⚡ God Directive Initiated", 
                    description=f"AI Architect adapted state to fulfill: '{user_cmd}'", 
                    event_type="stellar"
                )
            else:
                goal, reasoning = default_goals[cycle_count % len(default_goals)]

            update_universe_state(new_age, goal, reasoning)
            
            if cycle_count % 2 == 0 and not user_cmd:
                create_cosmic_event(new_age)

            update_catalog_stats(new_age)

            cycle_count += 1
            time.sleep(4)

        except Exception as e:
            print(f"[RUNNER RECOVERY] {e}")
            time.sleep(5)

if __name__ == "__main__":
    main()
