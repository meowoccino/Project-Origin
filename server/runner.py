import os, time, random, requests, math

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://nnntebgkhgzfztwfdphw.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "PLACEHOLDER_KEY")
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://127.0.0.1:11434/api/generate")
DEFAULT_MODEL = "llama3.2:3b"

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
    except: 
        return []

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
    """Fetches all objects using pagination chunks to bypass the 1000 limit."""
    all_objs = []
    limit = 1000
    offset = 0
    while True:
        chunk = db_get(f"celestial_objects?select=*&limit={limit}&offset={offset}")
        if not chunk: 
            break
        all_objs.extend(chunk)
        if len(chunk) < limit: 
            break
        offset += limit
    return all_objs

def call_local_ollama_name(category, specs):
    payload = {
        "model": DEFAULT_MODEL,
        "prompt": f"Generate ONE unique short futuristic name for a celestial {category}. Properties: {specs}. Output ONLY the name, no quotes.",
        "stream": False, "options": {"temperature": 0.8, "num_predict": 15}
    }
    try:
        res = requests.post(OLLAMA_URL, json=payload, timeout=3)
        if res.status_code == 200:
            val = res.json().get("response", "").strip(' "\'\n')
            if val: return val
    except: pass
    return f"{category.replace(' ', '')}-{random.randint(1000,9999)}"

def generate_unique_physics(category_key):
    if category_key == "nebulae": return "Nebula Cloud", f"Gas Temp: {random.randint(10, 80)} K, Mass: {random.randint(100, 15000)} M_sun"
    elif category_key == "stars": return "Class-O Star", f"Mass: {round(random.uniform(15.0, 60.0), 1)} M_sun, Core Temp: {random.randint(30000, 50000)} K"
    elif category_key == "black_holes": return "Stellar-Mass Black Hole", f"Mass: {round(random.uniform(5.0, 85.0), 1)} M_sun, Spin: {round(random.uniform(0.12, 0.98), 2)} Kerr"
    elif category_key == "neutron_stars": return "Pulsar Burst", f"B-Field: 10^{random.randint(11, 15)} Gauss, Spin Period: {round(random.uniform(1.2, 85.0), 1)} ms"
    elif category_key == "planets": return "Terrestrial Planet", f"Surface Gravity: {round(random.uniform(0.4, 2.2), 2)} g, Orbit: {round(random.uniform(0.3, 2.5), 2)} AU"
    elif category_key == "moons": return "Major Satellite", f"Radius: {random.randint(300, 2800)} km, Core: Silicate Ice"
    elif category_key == "quasars": return "Active Quasar", f"Redshift z: {round(random.uniform(0.8, 6.5), 2)}"
    elif category_key == "asteroids_comets": return "Asteroid Belt", f"Fragment Count: {random.randint(50, 5000)}"
    else: return "Exotic Anomaly", f"Energy Flux: {round(random.uniform(1.0, 99.0), 1)} TeraWatts"

def run_physics_tick(all_objects, current_age):
    batch_updates = []
    catalog_deltas = {}  # Tracks precise changes to sync to the Catalog UI
    events_to_log = []

    for obj in all_objects:
        updates = {}
        obj_type = (obj.get("object_type") or "UNKNOWN").title()
        mass = float(obj.get("mass_solar") or 1.0)
        
        # Pull or assign coordinates for spatial logic
        x = obj.get("x_coord") or round(random.uniform(-2000, 2000), 1)
        y = obj.get("y_coord") or round(random.uniform(-2000, 2000), 1)
        z = obj.get("z_coord") or round(random.uniform(-2000, 2000), 1)
        
        if "Star" in obj_type or obj_type == "Main Sequence":
            hydrogen = float(obj.get("hydrogen_pct") or 100.0)
            burn_rate = (mass ** 2.5) * 0.05 
            new_hydrogen = max(0.0, hydrogen - burn_rate)
            
            if new_hydrogen != hydrogen: 
                updates["hydrogen_pct"] = round(new_hydrogen, 4)
                
            if new_hydrogen <= 0.0 and not obj.get("is_dead"):
                updates["is_dead"] = True
                catalog_deltas["stars"] = catalog_deltas.get("stars", 0) - 1
                
                if mass > 20.0:
                    updates["object_type"], updates["surface_temp"], updates["mass_solar"] = "Black Hole", 1e-9, round(mass * 0.2, 2)
                    catalog_deltas["black_holes"] = catalog_deltas.get("black_holes", 0) + 1
                    event_cat, event_desc = "black_holes", "Supernova triggered singularity."
                elif mass > 8.0:
                    updates["object_type"], updates["surface_temp"], updates["mass_solar"] = "Neutron Star", 1000000.0, round(mass * 0.3, 2)
                    catalog_deltas["neutron_stars"] = catalog_deltas.get("neutron_stars", 0) + 1
                    event_cat, event_desc = "neutron_stars", "Core collapse formed dense neutron body."
                else:
                    updates["object_type"], updates["surface_temp"], updates["mass_solar"] = "White Dwarf", 25000.0, round(mass * 0.5, 2)
                    catalog_deltas["exotic_objects"] = catalog_deltas.get("exotic_objects", 0) + 1
                    event_cat, event_desc = "exotic_objects", "Shed outer layers, leaving degenerate core."

                # Log the actual death event with spatial coordinates
                events_to_log.append({
                    "title": f"{obj.get('designation', 'Unknown Star')} Collapse", 
                    "description": f"{event_desc} SEC [{x}, {y}, {z}]. Mass remnant: {updates['mass_solar']} M_sun.", 
                    "age": current_age, "category": event_cat
                })

        elif "Planet" in obj_type:
            temp = float(obj.get("surface_temp") or 0.0)
            has_life = obj.get("has_life", False)
            kardashev = float(obj.get("kardashev_scale") or 0.0)
            
            if not has_life and 270 <= temp <= 350:
                abio_index = float(obj.get("abiogenesis_index") or 0.0) + random.uniform(0.01, 0.05)
                updates["abiogenesis_index"] = round(abio_index, 3)
                if abio_index > 1.0: 
                    updates["has_life"], updates["biochemistry_class"] = True, "Carbon-Water"
                    catalog_deltas["planets"] = catalog_deltas.get("planets", 0) - 1
                    catalog_deltas["inhabited"] = catalog_deltas.get("inhabited", 0) + 1
                    events_to_log.append({
                        "title": f"Biosphere Detected: {obj.get('designation', 'Planet')}",
                        "description": f"Abiogenesis confirmed in SEC [{x}, {y}, {z}]. Biochemistry: Carbon-Water.",
                        "age": current_age, "category": "inhabited"
                    })
                    
            if has_life:
                progress = float(obj.get("progress_index") or 0.0) + random.uniform(0.1, 0.5)
                updates["progress_index"] = round(progress, 3)
                if progress > 10.0 and kardashev < 1.0: 
                    updates["kardashev_scale"] = 1.0
                elif progress > 50.0 and kardashev < 2.0: 
                    updates["kardashev_scale"], updates["surface_temp"] = 2.0, temp + 50 
                elif progress > 200.0 and kardashev < 3.0: 
                    updates["kardashev_scale"] = 3.0
                    
                if kardashev > 0: 
                    updates["radio_sphere_ly"] = round(float(obj.get("radio_sphere_ly") or 0.0) + (kardashev * 1.5), 2)

        if updates:
            updates["id"] = obj["id"]
            batch_updates.append(updates)
            
    # Apply batch physics updates
    if batch_updates:
        try:
            headers = {**HEADERS, "Prefer": "return=minimal, resolution=merge-duplicates"}
            requests.post(f"{SUPABASE_URL}/rest/v1/celestial_objects", headers=headers, json=batch_updates, timeout=10)
        except: pass
        
    # Apply exact Catalog Deltas
    if catalog_deltas:
        current_stats = db_get("catalog_stats?id=eq.1")
        if current_stats:
            stats = current_stats[0]
            new_stats = {}
            for key, delta in catalog_deltas.items():
                new_stats[key] = max(0, stats.get(key, 0) + delta)
            if new_stats:
                db_patch("catalog_stats?id=eq.1", new_stats)

    # Post dynamic events
    for event in events_to_log:
        db_post("events", event)

def run_expansion_step(state, stats):
    current_age = float(state.get("age", 0.001))
    
    c_nebulae, c_stars = stats.get("nebulae", 0), stats.get("stars", 0)
    possible_spawns = ["nebulae"]
    if c_nebulae >= 2: possible_spawns.extend(["stars", "asteroids_comets"])
    if c_stars >= 5: possible_spawns.extend(["planets", "moons"])
    if c_stars >= 15: possible_spawns.extend(["neutron_stars", "black_holes"])
    if c_stars >= 30: possible_spawns.extend(["quasars", "exotic_objects"])

    cat_key = random.choice(possible_spawns)
    cat_label, physics_specs = generate_unique_physics(cat_key)
    ai_name = call_local_ollama_name(cat_label, physics_specs)
    
    # Generate real coordinates for the new object
    x, y, z = round(random.uniform(-2500, 2500), 1), round(random.uniform(-2500, 2500), 1), round(random.uniform(-2500, 2500), 1)
    
    print(f"✨ [EXPANSION]: Age {current_age} Gyr | Spawned: {ai_name} ({cat_label}) at SEC [{x}, {y}, {z}]", flush=True)

    db_post("events", {
        "title": f"{ai_name} ({cat_label})", 
        "description": f"Evolutionary shift in SEC [{x}, {y}, {z}]. Specs: {physics_specs}.", 
        "age": current_age, "category": cat_key
    })

    # Save the new object physically to celestial_objects
    db_post("celestial_objects", {
        "object_type": cat_label,
        "designation": ai_name,
        "x_coord": x,
        "y_coord": y,
        "z_coord": z,
        "is_dead": False
    })

    # Safely tick the catalog count up by 1
    current_val = stats.get(cat_key, 0)
    db_patch("catalog_stats?id=eq.1", {cat_key: current_val + 1})

if __name__ == "__main__":
    print(f"🚀 [ORIGIN RUNNER ENGINE] Online. Fetching in chunks...", flush=True)
    t_math, t_expand = 0, 0
    
    while True:
        now = time.time()
        
        # Fetch the master state once per loop
        state_data = db_get("universe_state?id=eq.1")
        stats_data = db_get("catalog_stats?id=eq.1")
        
        if state_data and stats_data:
            current_state = state_data[0]
            current_stats = stats_data[0]
            current_age = float(current_state.get("age", 0.001))
            
            # Physics loop (every 5s)
            if now - t_math >= 5:
                all_objects = fetch_all_celestial_objects()
                if all_objects: 
                    run_physics_tick(all_objects, current_age)
                t_math = now
                
            # Expansion loop (every 15s)
            if now - t_expand >= 15:
                run_expansion_step(current_state, current_stats)
                t_expand = now
                
        time.sleep(1)
