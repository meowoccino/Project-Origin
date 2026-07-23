python3 -c '
code = """import os
import time
import math
import random
import requests

SUPABASE_URL = "https://nnntebgkhgzfztwfdphw.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ubnRlYmdraGd6Znp0d2ZkcGh3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDU3NTQ1NiwiZXhwIjoyMTAwMTUxNDU2fQ.YxpoNTujXCrJQcxZ9Bj8f_bFC6j_Fq6GLt74H8mEAq0"

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

MAIN_DT_GYR = 0.001 
CRUISE_TICK_SEC = 60
SPRINT_TICK_SEC = 2
SPRINT_THRESHOLD_GYR = 0.1

def calculate_cosmology(age_gyr):
    omega_m = 0.315 / (1.0 + (age_gyr * 0.25)**3)
    omega_lambda = 1.0 - omega_m
    return round(omega_lambda * 100.0, 1), round(omega_m * 84.0, 1), round(100.0 - (omega_lambda * 100.0) - (omega_m * 84.0), 1)

def calculate_sagan_kardashev(watts):
    if watts <= 0: return 0.0
    return round(max(0.0, (math.log10(watts) - 6.0) / 10.0), 3)

def calculate_biological_progress(planet_age_gyr):
    if planet_age_gyr < 0.1: return 0.0
    progress = (planet_age_gyr / 4.0) ** 0.5
    return round(min(progress, 2.5), 3)

def seed_celestial_object(age_gyr):
    temp = random.uniform(-200, 400)
    has_life = False
    bio_class = None
    
    if 0 <= temp <= 50:
        if random.random() < 0.10:
            has_life, bio_class = True, "Carbon/Water"
    elif temp < -100:
        if random.random() < 0.60:
            has_life, bio_class = True, "Carbon/Methane (Titan-analog)"
    elif temp > 100:
        if random.random() < 0.30:
            has_life, bio_class = True, "Carbon/Sulfur-reducing"

    planet_age = random.uniform(0.1, max(0.1, age_gyr / 2.0)) if age_gyr > 0.2 else 0
    prog_idx = calculate_biological_progress(planet_age) if has_life else 0.0
    
    watts = 0
    if prog_idx > 0.8:
        watts = 10 ** random.uniform(10, 26)
    k_scale = calculate_sagan_kardashev(watts) if watts > 0 else 0.0

    return {
        "name": f"Exoplanet {random.randint(1000, 9999)}-{random.choice(\"abcdef\")}",
        "object_type": "Planet",
        "surface_temp": round(temp, 1),
        "has_life": has_life,
        "biochemistry_class": bio_class,
        "progress_index": prog_idx,
        "kardashev_scale": k_scale
    }

def run_simulation():
    print("🚀 [PROJECT ORIGIN] Advanced Physics Engine Initialized...")
    current_age_gyr = 0.0
    tick = 0
    
    while True:
        tick += 1
        current_age_gyr += MAIN_DT_GYR
        is_sprint = current_age_gyr < SPRINT_THRESHOLD_GYR
        
        de_pct, dm_pct, baryon_pct = calculate_cosmology(current_age_gyr)
        
        try:
            u_payload = {"age": current_age_gyr, "de_pct": de_pct, "dm_pct": dm_pct, "baryon_pct": baryon_pct}
            requests.post(f"{SUPABASE_URL}/rest/v1/universe_state", headers=HEADERS, json=u_payload, timeout=5)
            
            if current_age_gyr >= 0.1 and random.random() < 0.20:
                obj_payload = seed_celestial_object(current_age_gyr)
                requests.post(f"{SUPABASE_URL}/rest/v1/celestial_objects", headers=HEADERS, json=obj_payload, timeout=5)

            mode = "SPRINT" if is_sprint else "CRUISE"
            print(f"[{mode} | Tick {tick}] Age: {current_age_gyr:.4f} Gyr")
            
        except Exception as e:
            print(f"⚠️ [Tick {tick}] Network timeout, continuing...")
            
        time.sleep(SPRINT_TICK_SEC if is_sprint else CRUISE_TICK_SEC)

if __name__ == "__main__":
    run_simulation()
"""
with open("/home/ubuntu/Project-Origin/server/runner.py", "w") as f:
    f.write(code)
print("✅ runner.py successfully created!")
'
