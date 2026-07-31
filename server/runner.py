import os, time, random, requests, sys, math

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

def log_error(context, error):
    print(f"❌ [RUNNER ERROR] {context}: {error}", file=sys.stderr, flush=True)

def db_get(endpoint):
    try:
        res = requests.get(f"{SUPABASE_URL}/rest/v1/{endpoint}", headers=HEADERS, timeout=10)
        res.raise_for_status()
        return res.json()
    except Exception as e:
        log_error(f"GET {endpoint}", e)
        return []

def db_patch(endpoint, payload):
    try:
        headers = {**HEADERS, "Prefer": "return=minimal"}
        res = requests.patch(f"{SUPABASE_URL}/rest/v1/{endpoint}", headers=headers, json=payload, timeout=10)
        res.raise_for_status()
    except Exception as e:
        log_error(f"PATCH {endpoint}", e)

def db_post(endpoint, payload):
    try:
        res = requests.post(f"{SUPABASE_URL}/rest/v1/{endpoint}", headers=HEADERS, json=payload, timeout=10)
        res.raise_for_status()
    except Exception as e:
        log_error(f"POST {endpoint}", e)

def calculate_ms_lifespan(mass_solar):
    return 10.0 * (max(mass_solar, 0.01) ** -2.5)

def run_physics_tick(all_objects, current_age):
    batch_updates = []
    catalog_deltas = {}
    events_to_log = []
    
    # 1. Spatial Collision & Gravity Pass
    black_holes = [obj for obj in all_objects if "Black Hole" in obj.get("object_type", "") and not obj.get("is_dead")]
    stars = [obj for obj in all_objects if "Star" in obj.get("object_type", "") and not obj.get("is_dead")]

    # Check for Tidal Disruptions (Stars falling into Black Holes)
    for bh in black_holes:
        for star in stars:
            if star.get("is_dead"): continue
            dist = math.sqrt((bh.get("x_coord",0) - star.get("x_coord",0))**2 + 
                             (bh.get("y_coord",0) - star.get("y_coord",0))**2 + 
                             (bh.get("z_coord",0) - star.get("z_coord",0))**2)
            
            if dist < 50.0: # Collision threshold
                star["is_dead"] = True
                bh_mass_new = float(bh.get("mass_solar", 10.0)) + float(star.get("mass_solar", 1.0))
                
                batch_updates.append({"id": star["id"], "is_dead": True, "object_type": "Destroyed Remnant"})
                batch_updates.append({"id": bh["id"], "mass_solar": round(bh_mass_new, 2)})
                
                catalog_deltas["stars"] = catalog_deltas.get("stars", 0) - 1
                events_to_log.append({
                    "title": f"Tidal Disruption: {star.get('designation')}",
                    "description": f"Star consumed by Singularity at SEC [{round(bh['x_coord'])}, {round(bh['y_coord'])}]. Mass absorbed.",
                    "age": current_age, "category": "black_holes"
                })

    # 2. Stellar Evolution Pass
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
                    updates["object_type"], updates["mass_solar"], updates["category"] = "Black Hole", round(mass * 0.15, 2), "black_holes"
                    catalog_deltas["black_holes"] = catalog_deltas.get("black_holes", 0) + 1
                elif mass > 8.0:
                    updates["object_type"], updates["mass_solar"], updates["category"] = "Neutron Star", round(mass * 0.1, 2), "neutron_stars"
                    catalog_deltas["neutron_stars"] = catalog_deltas.get("neutron_stars", 0) + 1
                else:
                    updates["object_type"], updates["mass_solar"], updates["category"] = "White Dwarf", round(min(mass * 0.5, 1.4), 2), "white_dwarfs"
                    catalog_deltas["white_dwarfs"] = catalog_deltas.get("white_dwarfs", 0) + 1

                events_to_log.append({
                    "title": f"Core Collapse: {obj.get('designation')}", 
                    "description": f"Thermodynamic fusion ceased. Remnant mass: {updates['mass_solar']} M_sun.", 
                    "age": current_age, "category": updates["category"]
                })

        if updates:
            updates["id"] = obj["id"]
            # Avoid duplicating updates from collision pass
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
    log_msg("🚀 Origin Runner Engine Online. Physics & Collisions Active.")
    t_math = 0
    while True:
        now = time.time()
        state_data = db_get("universe_state?id=eq.1")
        
        if state_data:
            current_age = float(state_data[0].get("age", 0.0))
            if now - t_math >= 15:
                all_objects = db_get("celestial_objects?select=*&limit=1000")
                if all_objects: run_physics_tick(all_objects, current_age)
                t_math = now
                
        time.sleep(1)
