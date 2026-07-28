import os, time, random, requests, math

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://nnntebgkhgzfztwfdphw.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "PLACEHOLDER_KEY")

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

def db_get(endpoint):
    try:
        res = requests.get(f"{SUPABASE_URL}/rest/v1/{endpoint}", headers=HEADERS, timeout=10)
        return res.json() if res.status_code == 200 else []
    except: return []

def db_patch(endpoint, payload):
    try:
        headers = {**HEADERS, "Prefer": "return=minimal"}
        requests.patch(f"{SUPABASE_URL}/rest/v1/{endpoint}", headers=headers, json=payload, timeout=5)
    except: pass

def db_post(endpoint, payload):
    try:
        requests.post(f"{SUPABASE_URL}/rest/v1/{endpoint}", headers=HEADERS, json=payload, timeout=5)
    except: pass

def fetch_all_celestial_objects():
    all_objs = []
    limit = 1000
    offset = 0
    while True:
        chunk = db_get(f"celestial_objects?select=*&limit={limit}&offset={offset}")
        if not chunk: break
        all_objs.extend(chunk)
        if len(chunk) < limit: break
        offset += limit
    return all_objs

def calculate_ms_lifespan(mass_solar):
    # Main Sequence lifespan t ~ 10 * (M/M_sun)^-2.5 in Gyr
    return 10.0 * (mass_solar ** -2.5)

def run_physics_tick(all_objects, current_age):
    batch_updates = []
    catalog_deltas = {}
    events_to_log = []

    for obj in all_objects:
        updates = {}
        obj_type = (obj.get("object_type") or "UNKNOWN").title()
        mass = float(obj.get("mass_solar") or 1.0)
        
        birth_age = obj.get("created_at_gyr")
        if birth_age is None:
            birth_age = current_age
            updates["created_at_gyr"] = current_age
        else:
            birth_age = float(birth_age)
            
        x = obj.get("x_coord") or 0.0
        y = obj.get("y_coord") or 0.0
        z = obj.get("z_coord") or 0.0
        
        if "Star" in obj_type or obj_type == "Main Sequence":
            lifespan_gyr = calculate_ms_lifespan(mass)
            age_of_star = current_age - birth_age
            
            hydrogen_pct = max(0.0, 100.0 * (1.0 - (age_of_star / lifespan_gyr)))
            
            if abs(hydrogen_pct - float(obj.get("hydrogen_pct") or 100.0)) > 0.1:
                updates["hydrogen_pct"] = round(hydrogen_pct, 4)
                
            if hydrogen_pct <= 0.0 and not obj.get("is_dead"):
                updates["is_dead"] = True
                catalog_deltas["stars"] = catalog_deltas.get("stars", 0) - 1
                
                if mass > 20.0:
                    updates["object_type"], updates["surface_temp"], updates["mass_solar"] = "Black Hole", 2.7, round(mass * 0.15, 2)
                    catalog_deltas["black_holes"] = catalog_deltas.get("black_holes", 0) + 1
                    event_cat = "black_holes"
                elif mass > 8.0:
                    updates["object_type"], updates["surface_temp"], updates["mass_solar"] = "Neutron Star", 1000000.0, round(mass * 0.1, 2)
                    catalog_deltas["neutron_stars"] = catalog_deltas.get("neutron_stars", 0) + 1
                    event_cat = "neutron_stars"
                else:
                    updates["object_type"], updates["surface_temp"], updates["mass_solar"] = "White Dwarf", 25000.0, round(mass * 0.5, 2)
                    catalog_deltas["exotic_objects"] = catalog_deltas.get("exotic_objects", 0) + 1
                    event_cat = "exotic_objects"

                events_to_log.append({
                    "title": f"Core Collapse: {obj.get('designation', 'Star')}", 
                    "description": f"Thermodynamic fusion ceased in SEC [{x}, {y}, {z}]. Remnant mass: {updates['mass_solar']} M_sun.", 
                    "age": current_age, "category": event_cat
                })

        if updates:
            updates["id"] = obj["id"]
            batch_updates.append(updates)
            
    if batch_updates:
        try:
            headers = {**HEADERS, "Prefer": "return=minimal, resolution=merge-duplicates"}
            requests.post(f"{SUPABASE_URL}/rest/v1/celestial_objects", headers=headers, json=batch_updates, timeout=10)
        except: pass
        
    if catalog_deltas:
        current_stats = db_get("catalog_stats?id=eq.1")
        if current_stats:
            stats = current_stats[0]
            new_stats = {}
            for key, delta in catalog_deltas.items():
                new_stats[key] = max(0, stats.get(key, 0) + delta)
            if new_stats:
                db_patch("catalog_stats?id=eq.1", new_stats)

    for event in events_to_log:
        db_post("events", event)

def spawn_object(cat_key, cat_label, physics_specs, current_age):
    x = round(random.uniform(-5000, 5000), 1)
    y = round(random.uniform(-5000, 5000), 1)
    z = round(random.uniform(-5000, 5000), 1)
    designation = f"{cat_label.replace(' ', '')}-{random.randint(1000,9999)}"
    
    db_post("events", {
        "title": designation, 
        "description": f"Formation detected in SEC [{x}, {y}, {z}]. Specs: {physics_specs}.", 
        "age": current_age, "category": cat_key
    })

    db_post("celestial_objects", {
        "object_type": cat_label, "designation": designation,
        "x_coord": x, "y_coord": y, "z_coord": z,
        "is_dead": False, "hydrogen_pct": 100.0,
        "mass_solar": round(random.uniform(0.1, 50.0), 2) if "Star" in cat_label else 0.0,
        "created_at_gyr": current_age
    })

    current_stats = db_get("catalog_stats?id=eq.1")
    if current_stats:
        current_val = current_stats[0].get(cat_key, 0)
        db_patch("catalog_stats?id=eq.1", {cat_key: current_val + 1})

def run_expansion_step(state, stats):
    current_age = float(state.get("age", 0.0))
    
    if current_age < 0.1:
        if random.random() < 0.2:
            spawn_object("nebulae", "Primordial Gas Cloud", f"Temp: {random.randint(10, 50)} K", current_age)
        return

    c_nebulae = stats.get("nebulae", 0)
    c_stars = stats.get("stars", 0)
    
    if c_nebulae > 0 and random.random() < 0.7:
        spawn_object("stars", "Main Sequence Star", f"Core Temp: {random.randint(5000, 45000)} K", current_age)
        db_patch("catalog_stats?id=eq.1", {"nebulae": max(0, c_nebulae - 1)})
    elif c_stars > 5 and random.random() < 0.4:
        spawn_object("planets", "Terrestrial Planet", f"Orbit: {round(random.uniform(0.3, 2.5), 2)} AU", current_age)
    elif c_stars > 10 and random.random() < 0.2:
        spawn_object("asteroids_comets", "Asteroid Belt", f"Fragment Count: {random.randint(1000, 9000)}", current_age)

if __name__ == "__main__":
    print(f"🚀 [ORIGIN RUNNER ENGINE] Online. 1:1 Physics Mode...", flush=True)
    t_math, t_expand = 0, 0
    big_bang_logged = False
    
    while True:
        now = time.time()
        state_data = db_get("universe_state?id=eq.1")
        stats_data = db_get("catalog_stats?id=eq.1")
        
        if state_data and stats_data:
            current_state = state_data[0]
            current_stats = stats_data[0]
            current_age = float(current_state.get("age", 0.0))
            
            if current_age < 0.0001 and not big_bang_logged:
                db_post("events", {
                    "title": "The Big Bang", 
                    "description": "Inflationary epoch initialized. SEC [0.0, 0.0, 0.0].", 
                    "age": 0.0, "category": "exotic_objects"
                })
                big_bang_logged = True
            elif current_age > 0.0001:
                big_bang_logged = True
            
            if now - t_math >= 5:
                all_objects = fetch_all_celestial_objects()
                if all_objects: 
                    run_physics_tick(all_objects, current_age)
                t_math = now
                
            if now - t_expand >= 15:
                run_expansion_step(current_state, current_stats)
                t_expand = now
                
        time.sleep(1)
