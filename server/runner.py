import os, sys, time, random, math, requests

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

def log_msg(msg): 
    print(f"[RUNNER] {msg}", flush=True)

def log_error(ctx, err): 
    print(f"❌ [RUNNER] {ctx}: {err}", file=sys.stderr, flush=True)

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
    except Exception as e:
        log_error(f"POST {endpoint}", e)

def db_patch(endpoint, payload):
    try:
        requests.patch(f"{SUPABASE_URL}/rest/v1/{endpoint}", headers=HEADERS, json=payload, timeout=10)
    except Exception as e:
        log_error(f"PATCH {endpoint}", e)

def calculate_ms_lifespan(mass_solar):
    return 10.0 * (max(mass_solar, 0.01) ** -2.5)

def spawn_object(cat_key, cat_label, physics_specs, current_age):
    # Enforce strict integers to prevent UI text bleed and regex failures
    x = int(random.uniform(-5000, 5000))
    y = int(random.uniform(-5000, 5000))
    z = int(random.uniform(-5000, 5000))
    
    designation = f"{cat_label.replace(' ', '')}-{random.randint(1000,9999)}"
    
    # Silent Dark Matter: Do not spam the events feed
    if cat_key != "dark_matter_structures":
        db_post("events", {
            "title": designation, 
            "description": f"Formation detected in SEC [{x}, {y}, {z}]. Specs: {physics_specs}.", 
            "age": current_age, 
            "category": cat_key
        })

    mass = 0.0
    if "Star" in cat_label or "Dwarf" in cat_label or "Giant" in cat_label: 
        mass = round(random.uniform(0.1, 50.0), 2)
    elif cat_key == "dark_matter_structures": 
        mass = round(random.uniform(1000, 100000), 2)
    elif cat_key == "quasars": 
        mass = round(random.uniform(1000000, 50000000), 2)

    db_post("celestial_objects", {
        "object_type": cat_label, 
        "designation": designation, 
        "category": cat_key,
        "x_coord": x, 
        "y_coord": y, 
        "z_coord": z, 
        "is_dead": False, 
        "hydrogen_pct": 100.0,
        "mass_solar": mass, 
        "birth_age_gyr": current_age
    })

    stats = db_get("catalog_stats?id=eq.1")
    if stats:
        current_count = stats[0].get(cat_key, 0)
        db_patch("catalog_stats?id=eq.1", {cat_key: current_count + 1})

def run_expansion_step(state, stats):
    current_age = float(state.get("age", 0.0))
    
    if current_age < 0.1:
        if random.random() < 0.3: spawn_object("dark_matter_structures", "Dark Matter Halo", f"Mass: {random.randint(1000, 50000)} M_sun", current_age)
        if random.random() < 0.2: spawn_object("nebulae", "Interstellar Nebula", f"Temp: {random.randint(10, 50)} K", current_age)
        return

    c_nebulae = stats.get("nebulae", 0)
    c_stars = stats.get("stars", 0)
    c_planets = stats.get("planets", 0)
    
    if c_nebulae > 0:
        if random.random() < 0.3: spawn_object("protostars", "Protostar", "Accreting mass.", current_age)
        if stats.get("dark_matter_structures", 0) > 0 and random.random() < 0.7:
            spawn_object("stars", "Main Sequence Star", f"Core Temp: {random.randint(5000, 45000)} K", current_age)
            db_patch("catalog_stats?id=eq.1", {"nebulae": max(0, c_nebulae - 1)})
            
    if c_stars > 5:
        if random.random() < 0.2: spawn_object("brown_dwarfs", "Brown Dwarf", "Failed fusion.", current_age)
        if random.random() < 0.1: spawn_object("giants_supergiants", "Supergiant", "Expanded envelope.", current_age)
        if random.random() < 0.4: spawn_object("planets", "Terrestrial Planet", f"Orbit: {round(random.uniform(0.3, 2.5), 2)} AU", current_age)
        if random.random() < 0.2: spawn_object("gas_giants", "Gas Giant", "Massive atmosphere.", current_age)
        if random.random() < 0.1: spawn_object("sterile_planets", "Sterile Planet", "No atmosphere.", current_age)
        if random.random() < 0.05: spawn_object("active_biospheres", "Active Biosphere", "Life detected.", current_age)
    
    if c_planets > 0 and random.random() < 0.5:
        spawn_object("moons", "Natural Satellite", f"Tidal Lock: {random.choice(['True', 'False'])}", current_age)
        
    if c_stars > 10 and random.random() < 0.3:
        spawn_object("asteroids_comets", "Asteroid Belt", f"Fragment Count: {random.randint(1000, 9000)}", current_age)
        
    if stats.get("black_holes", 0) > 0 and c_nebulae > 5 and random.random() < 0.1:
        spawn_object("quasars", "Active Quasar", f"Accretion Disk Temp: {random.randint(100000, 900000)} K", current_age)

def run_physics_tick(all_objects, current_age):
    batch_updates = []
    catalog_deltas = {}
    events_to_log = []
    
    black_holes = [obj for obj in all_objects if "Black Hole" in obj.get("object_type", "") and not obj.get("is_dead")]
    stars = [obj for obj in all_objects if "Star" in obj.get("object_type", "") and not obj.get("is_dead")]

    # Collisions
    for bh in black_holes:
        for star in stars:
            if star.get("is_dead"): continue
            dist = math.sqrt((bh.get("x_coord",0) - star.get("x_coord",0))**2 + 
                             (bh.get("y_coord",0) - star.get("y_coord",0))**2 + 
                             (bh.get("z_coord",0) - star.get("z_coord",0))**2)
            
            if dist < 50.0:
                star["is_dead"] = True
                bh_mass_new = float(bh.get("mass_solar", 10.0)) + float(star.get("mass_solar", 1.0))
                batch_updates.append({"id": star["id"], "is_dead": True, "object_type": "Destroyed Remnant"})
                batch_updates.append({"id": bh["id"], "mass_solar": round(bh_mass_new, 2)})
                catalog_deltas["stars"] = catalog_deltas.get("stars", 0) - 1
                events_to_log.append({
                    "title": f"Tidal Disruption: {star.get('designation')}",
                    "description": f"Star consumed by Singularity at SEC [{int(bh.get('x_coord',0))}, {int(bh.get('y_coord',0))}]. Mass absorbed.",
                    "age": current_age, "category": "black_holes"
                })

    # Aging and decay
    for obj in all_objects:
        if obj.get("is_dead"): continue
        updates = {}
        obj_type = (obj.get("object_type") or "UNKNOWN").title()
        mass = float(obj.get("mass_solar") or 1.0)
        birth_age = float(obj.get("birth_age_gyr") or current_age)
        
        if "Star" in obj_type or obj_type == "Main Sequence":
            lifespan_gyr = calculate_ms_lifespan(mass)
            age_of_star = current_age - birth_age
            
            hydrogen_pct = max(0.0, 100.0 * (1.0 - (age_of_star / lifespan_gyr)))
            
            if abs(hydrogen_pct - float(obj.get("hydrogen_pct") or 100.0)) > 0.1:
                updates["hydrogen_pct"] = round(hydrogen_pct, 4)
                
            if hydrogen_pct <= 0.0:
                updates["is_dead"] = True
                catalog_deltas["stars"] = catalog_deltas.get("stars", 0) - 1
                
                if mass > 20.0:
                    updates["object_type"] = "Black Hole"
                    updates["mass_solar"] = round(mass * 0.15, 2)
                    updates["category"] = "black_holes"
                    catalog_deltas["black_holes"] = catalog_deltas.get("black_holes", 0) + 1
                elif mass > 8.0:
                    updates["object_type"] = "Neutron Star"
                    updates["mass_solar"] = round(mass * 0.1, 2)
                    updates["category"] = "neutron_stars"
                    catalog_deltas["neutron_stars"] = catalog_deltas.get("neutron_stars", 0) + 1
                else:
                    updates["object_type"] = "White Dwarf"
                    updates["mass_solar"] = round(min(mass * 0.5, 1.4), 2)
                    updates["category"] = "white_dwarfs"
                    catalog_deltas["white_dwarfs"] = catalog_deltas.get("white_dwarfs", 0) + 1

                events_to_log.append({
                    "title": f"Core Collapse: {obj.get('designation')}", 
                    "description": f"Thermodynamic fusion ceased. Remnant mass: {updates['mass_solar']} M_sun.", 
                    "age": current_age, "category": updates["category"]
                })

        if updates:
            updates["id"] = obj["id"]
            if not any(u["id"] == updates["id"] for u in batch_updates):
                batch_updates.append(updates)
            
    if batch_updates:
        try:
            headers_batch = {**HEADERS, "Prefer": "return=minimal, resolution=merge-duplicates"}
            requests.post(f"{SUPABASE_URL}/rest/v1/celestial_objects", headers=headers_batch, json=batch_updates, timeout=10)
        except Exception as e:
            log_error("BATCH POST", e)
        
    if catalog_deltas:
        current_stats = db_get("catalog_stats?id=eq.1")
        if current_stats:
            stats = current_stats[0]
            new_stats = {key: max(0, stats.get(key, 0) + delta) for key, delta in catalog_deltas.items()}
            db_patch("catalog_stats?id=eq.1", new_stats)

    for event in events_to_log:
        db_post("events", event)

if __name__ == "__main__":
    log_msg("🚀 Origin Runner Engine Online. Physics & Expansion Active.")
    
    t_math = 0
    t_expand = 0
    
    while True:
        now = time.time()
        
        state_data = db_get("universe_state?id=eq.1")
        stats_data = db_get("catalog_stats?id=eq.1")
        
        if state_data and stats_data:
            current_age = float(state_data[0].get("age", 0.0))
            
            if now - t_math >= 15:
                all_objects = db_get("celestial_objects?select=*&limit=1000")
                if all_objects:
                    run_physics_tick(all_objects, current_age)
                t_math = now
                
            if now - t_expand >= 15:
                run_expansion_step(state_data[0], stats_data[0])
                t_expand = now
                
        time.sleep(1)
