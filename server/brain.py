import time, math, random, requests

SUPABASE_URL = "https://nnntebgkhgzfztwfdphw.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ubnRlYmdraGd6Znp0d2ZkcGh3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDU3NTQ1NiwiZXhwIjoyMTAwMTUxNDU2fQ.YxpoNTujXCrJQcxZ9Bj8f_bFC6j_Fq6GLt74H8mEAq0"
HEADERS = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}", "Content-Type": "application/json", "Prefer": "return=minimal"}

def calculate_cosmology(age):
    m = 0.315 / (1.0 + (age * 0.25)**3)
    l = 1.0 - m
    return round(l * 100, 1), round(m * 84, 1), round(100 - (l * 100) - (m * 84), 1)

def seed_celestial_object(age):
    t = random.uniform(-200, 400)
    has_life, bio = False, None
    if 0 <= t <= 50 and random.random() < 0.1: has_life, bio = True, "Carbon/Water"
    elif t < -100 and random.random() < 0.6: has_life, bio = True, "Carbon/Methane"
    elif t > 100 and random.random() < 0.3: has_life, bio = True, "Carbon/Sulfur"
    p_age = random.uniform(0.1, max(0.1, age / 2.0)) if age > 0.2 else 0
    prog = round(min((p_age / 4.0) ** 0.5, 2.5), 3) if has_life and p_age >= 0.1 else 0.0
    w = 10 ** random.uniform(10, 26) if prog > 0.8 else 0
    k = round(max(0.0, (math.log10(w) - 6.0) / 10.0), 3) if w > 0 else 0.0
    return {"name": f"Exoplanet {random.randint(1000, 9999)}-{random.choice('abcdef')}", "object_type": "Planet", "surface_temp": round(t, 1), "has_life": has_life, "biochemistry_class": bio, "progress_index": prog, "kardashev_scale": k}

def update_catalog_stats(age):
    stars = int(min(500000, age * 35000)) if age >= 0.1 else 0
    planets = int(min(120000, age * 8000)) if age >= 0.2 else 0
    nebulae = int(min(150, age * 12)) if age >= 0.05 else 2
    bh = int(min(450, age * 30)) if age >= 0.2 else 0
    data = {"id": 1, "nebulae": nebulae, "stars": stars, "black_holes": bh, "neutron_stars": int(bh * 2.5), "planets": planets, "moons": int(planets * 2.1), "asteroids_comets": int(planets * 15), "quasars": int(min(50, age * 5)) if age < 3.0 else 2, "exotic_objects": int(age * 3)}
    try:
        requests.post(f"{SUPABASE_URL}/rest/v1/catalog_stats", headers={**HEADERS, "Prefer": "resolution=merge-duplicates"}, json=data, timeout=5)
    except Exception: pass

def log_milestone_event(age, title, desc):
    try:
        # Query Supabase first to ensure event hasn't already been created
        check_headers = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"}
        check = requests.get(f"{SUPABASE_URL}/rest/v1/events", headers=check_headers, params={"title": f"eq.{title}"}, timeout=5)
        if check.status_code == 200 and len(check.json()) > 0:
            return  # Already exists in Supabase, skip insertion
            
        requests.post(f"{SUPABASE_URL}/rest/v1/events", headers=HEADERS, json={"age": age, "title": title, "description": desc}, timeout=5)
    except Exception: pass

def run():
    print("[PROJECT ORIGIN] Physics Engine Initialized with Real-Time Clock...")
    age, tick = 0.0, 0
    
    # Check/Log Big Bang at initial startup
    log_milestone_event(0.000001, "Cosmic Big Bang & Primordial Inflation", "Quantum vacuum inflaton decay drives space-time expansion, seeding initial baryonic density fluctuations.")

    while True:
        tick += 1
        sprint = age < 0.1
        dt = 0.00005555 if sprint else 0.001
        age += dt
        
        de, dm, b = calculate_cosmology(age)
        
        # Log major cosmic milestones
        if 0.00035 <= age <= 0.00045:
            log_milestone_event(age, "Cosmic Microwave Background", "Photons decouple from baryonic matter; universe cools below 3,000 K.")
        elif age >= 0.1:
            log_milestone_event(age, "Cosmic Dawn (Pop-III Stars)", "First generation of massive stars ignite out of primordial Hydrogen gas.")

        try:
            requests.post(f"{SUPABASE_URL}/rest/v1/universe_state", headers=HEADERS, json={"age": age, "de_pct": de, "dm_pct": dm, "baryon_pct": b}, timeout=5)
            if age >= 0.1 and random.random() < 0.2:
                requests.post(f"{SUPABASE_URL}/rest/v1/celestial_objects", headers=HEADERS, json=seed_celestial_object(age), timeout=5)
            update_catalog_stats(age)
            print(f"[{'SPRINT (1h)' if sprint else 'CRUISE (30d)'} | Tick {tick}] Age: {age:.6f} Gyr")
        except Exception as e:
            print(f"[Tick {tick}] Network error: {e}")
            
        time.sleep(2 if sprint else 60)

if __name__ == "__main__":
    run()
