import os, sys, time, random, math, requests

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

def log_msg(msg): print(f"[RUNNER] {msg}", flush=True)
def log_error(ctx, err): print(f"❌ [RUNNER] {ctx}: {err}", file=sys.stderr, flush=True)

def db_get(endpoint):
    try:
        res = requests.get(f"{SUPABASE_URL}/rest/v1/{endpoint}", headers=HEADERS, timeout=10)
        res.raise_for_status()
        return res.json()
    except Exception as e:
        log_error(f"GET {endpoint}", e)
        return []

def db_post(endpoint, payload):
    try:
        requests.post(f"{SUPABASE_URL}/rest/v1/{endpoint}", headers=HEADERS, json=payload, timeout=10)
    except Exception as e: log_error(f"POST {endpoint}", e)

def db_patch(endpoint, payload):
    try:
        requests.patch(f"{SUPABASE_URL}/rest/v1/{endpoint}", headers=HEADERS, json=payload, timeout=10)
    except Exception as e: log_error(f"PATCH {endpoint}", e)

def calculate_ms_lifespan(mass_solar):
    return 10.0 * (max(mass_solar, 0.01) ** -2.5)

def spawn_object(cat_key, cat_label, physics_specs, current_age):
    x, y, z = int(random.uniform(-5000, 5000)), int(random.uniform(-5000, 5000)), int(random.uniform(-5000, 5000))
    designation = f"{cat_label.replace(' ', '')}-{random.randint(1000,9999)}"
    
    if cat_key != "dark_matter_structures":
        db_post("events", {
            "title": designation, 
            "description": f"Formation detected in SEC [{x}, {y}, {z}]. Specs: {physics_specs}.", 
            "age": current_age, 
            "category": cat_key
        })

    mass = 0.0
    if "Star" in cat_label or "Dwarf" in cat_label or "Giant" in cat_label: mass = round(random.uniform(0.1, 50.0), 2)
    elif cat_key == "dark_matter_structures": mass = round(random.uniform(1000, 100000), 2)
    elif cat_key == "quasars": mass = round(random.uniform(1000000, 50000000), 2)

    db_post("celestial_objects", {
        "object_type": cat_label, "designation": designation, "category": cat_key,
        "x_coord": x, "y_coord": y, "z_coord": z, "is_dead": False, "hydrogen_pct": 100.0,
        "mass_solar": mass, "birth_age_gyr": current_age
    })

    stats = db_get("catalog_stats?id=eq.1")
    if stats:
        db_patch("catalog_stats?id=eq.1", {cat_key: stats[0].get(cat_key, 0) + 1})

def run_physics_tick(current_age):
    active_stars = db_get("celestial_objects?is_dead=is.false&category=ilike.*star*&limit=500")
    active_bhs = db_get("celestial_objects?is_dead=is.false&category=eq.black_holes&limit=100")
    
    batch_updates, catalog_deltas, events_to_log = [], {}, []

    for bh in active_bhs:
        for star in active_stars:
            if star.get("is_dead"): continue
            dist = math.sqrt((bh.get("x_coord",0) - star.get("x_coord",0))**2 + (bh.get("y_coord",0) - star.get("y_coord",0))**2 + (bh.get("z_coord",0) - star.get("z_coord",0))**2)
            if dist < 50.0:
                star["is_dead"] = True
                bh_mass_new = float(bh.get("mass_solar", 10.0)) + float(star.get("mass_solar", 1.0))
                batch_updates.extend([{"id": star["id"], "is_dead": True, "object_type": "Destroyed Remnant"}, {"id": bh["id"], "mass_solar": round(bh_mass_new, 2)}])
                catalog_deltas[star.get("category")] = catalog_deltas.get(star.get("category"), 0) - 1
                events_to_log.append({"title": f"Tidal Disruption: {star.get('designation')}", "description": f"Star consumed by Singularity at SEC [{int(bh.get('x_coord',0))}, {int(bh.get('y_coord',0))}].", "age": current_age, "category": "black_holes"})

    for obj in active_stars:
        if obj.get("is_dead"): continue
        mass = float(obj.get("mass_solar") or 1.0)
        lifespan_gyr = calculate_ms_lifespan(mass)
        age_of_star = current_age - float(obj.get("birth_age_gyr") or current_age)
        hydrogen_pct = max(0.0, 100.0 * (1.0 - (age_of_star / lifespan_gyr)))
        
        if hydrogen_pct <= 0.0:
            obj["is_dead"] = True
            cat = obj.get("category")
            catalog_deltas[cat] = catalog_deltas.get(cat, 0) - 1
            if mass > 20.0:
                batch_updates.append({"id": obj["id"], "is_dead": True, "object_type": "Black Hole", "mass_solar": round(mass * 0.15, 2), "category": "black_holes"})
                catalog_deltas["black_holes"] = catalog_deltas.get("black_holes", 0) + 1
            elif mass > 8.0:
                batch_updates.append({"id": obj["id"], "is_dead": True, "object_type": "Neutron Star", "mass_solar": round(mass * 0.1, 2), "category": "neutron_stars"})
                catalog_deltas["neutron_stars"] = catalog_deltas.get("neutron_stars", 0) + 1
            else:
                batch_updates.append({"id": obj["id"], "is_dead": True, "object_type": "White Dwarf", "mass_solar": round(min(mass * 0.5, 1.4), 2), "category": "white_dwarfs"})
                catalog_deltas["white_dwarfs"] = catalog_deltas.get("white_dwarfs", 0) + 1
            events_to_log.append({"title": f"Core Collapse: {obj.get('designation')}", "description": "Thermodynamic fusion ceased.", "age": current_age, "category": "stellar_core"})

    if batch_updates:
        headers_batch = {**HEADERS, "Prefer": "return=minimal, resolution=merge-duplicates"}
        requests.post(f"{SUPABASE_URL}/rest/v1/celestial_objects", headers=headers_batch, json=batch_updates, timeout=10)
    
    if catalog_deltas:
        current_stats = db_get("catalog_stats?id=eq.1")
        if current_stats:
            new_stats = {key: max(0, current_stats[0].get(key, 0) + delta) for key, delta in catalog_deltas.items()}
            db_patch("catalog_stats?id=eq.1", new_stats)

    for event in events_to_log: db_post("events", event)

if __name__ == "__main__":
    log_msg("🚀 Origin Runner Engine Online. Master Clock Active.")
    
    res_state = db_get("universe_state?id=eq.1")
    genesis = float(res_state[0].get("genesis_time")) if res_state and res_state[0].get("genesis_time") else time.time()
    if not res_state or not res_state[0].get("genesis_time"):
        db_post("universe_state", {"id": 1, "age": 0.0, "genesis_time": genesis, "epoch": "Primordial Inflation"})

    t_math = 0
    while True:
        now = time.time()
        elapsed = now - genesis
        
        if elapsed <= 3600: age_gyr = (elapsed / 3600.0) * 0.1
        else: age_gyr = 0.1 + ((elapsed - 3600) / 2592000.0) * 99.9
            
        epoch = "Primordial Inflation"
        if age_gyr >= 0.001: epoch = "Recombination & Decoupling"
        if age_gyr >= 0.01: epoch = "Pop-III Star Reionization"
        if age_gyr >= 0.1: epoch = "Galactic Disk Accretion"
        if age_gyr >= 1.0: epoch = "Stellar & Deep Time Era"
            
        db_patch("universe_state", {"id": 1}, {"age": age_gyr, "epoch": epoch})

        if now - t_math >= 15:
            run_physics_tick(age_gyr)
            stats_data = db_get("catalog_stats?id=eq.1")
            if stats_data: spawn_object("nebulae", "Interstellar Nebula", f"Temp: {random.randint(10, 50)} K", age_gyr) # basic continuous expansion
            t_math = now
            
        time.sleep(1)
