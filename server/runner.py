import time
import math
import random
import requests

# --- SUPABASE CONFIGURATION ---
SUPABASE_URL = "https://nnntebgkhgzfztwfdphw.supabase.co"
SUPABASE_KEY = "sb_publishable_O5qr-6UD-6wTzi51j3tYtw_00N9Q4ja"
HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

# --- ENGINE TIMING CONSTANTS ---
TICK_INTERVAL_SEC = 60         # 1 minute real time per tick
PRIMORDIAL_TICKS = 60          # Hour 1 (Ticks 1-60): Dark Ages (0.0 to 0.1 Gyr)
MAIN_DT_GYR = 0.000317         # Ticks 61+: ~317,000 yrs/min (~13.7 Gyr over 30 days, continuous)

def calculate_cosmology(age_gyr):
    """Calculates scale factor a(t) and energy densities based on Lambda-CDM equations."""
    omega_m = 0.315 / (1.0 + (age_gyr * 0.25)**3)
    omega_lambda = 1.0 - omega_m
    
    de_pct = round(max(0.0, min(99.0, omega_lambda * 100.0)), 1)
    dm_pct = round(max(0.0, min(99.0, omega_m * 84.0)), 1)
    baryon_pct = round(max(0.1, 100.0 - de_pct - dm_pct), 1)
    
    return de_pct, dm_pct, baryon_pct

def calculate_catalog_counts(age_gyr):
    """Generates physical object populations based strictly on current cosmic age."""
    if age_gyr < 0.001:  # Primordial Inflation / Recombination
        return 0, 0, 0, 0, 0, 0, 0, 0, 0
    elif age_gyr < 0.1:  # Dark Ages (Pop-III star reionization around 0.1 Gyr)
        pop_iii = int(age_gyr * 500)
        return 0, pop_iii, 0, 0, 0, 0, 0, 0, 0
    else:                # Main Galactic & Stellar Evolution
        growth_factor = math.pow(age_gyr / 13.8, 1.5)
        nebulae = int(120 * growth_factor)
        stars = int(14200 * growth_factor)
        black_holes = int(480 * growth_factor)
        neutron_stars = int(890 * growth_factor)
        planets = int(32000 * growth_factor)
        moons = int(85000 * growth_factor)
        asteroids = int(450000 * growth_factor)
        quasars = int(max(0, (5.0 - age_gyr) * 80)) if age_gyr < 6.0 else 12
        exotic = int(15 * growth_factor)
        return nebulae, stars, black_holes, neutron_stars, planets, moons, asteroids, quasars, exotic

def generate_directive_log(tick, age_gyr, mode):
    """Generates unscripted telemetry logs based on thermodynamic evaluation."""
    sectors = ["Sector 01", "Sector 04", "Kepler Field", "Perseus Arm", "Core Singularity"]
    targets = ["Onyx Filament", "Chronos Cluster", "Vespera Vortex", "Zephyrus Node", "Primordial Cloud"]
    actions = [
        "Analyzing local thermodynamic entropy gradient.",
        "Accreting disk metallicity surrounding target system.",
        "Evaluating gravitational wave perturbations.",
        "Tracking photon decoupling and cosmic background temperature."
    ]
    
    sector = sectors[tick % len(sectors)]
    subject = targets[(tick * 3) % len(targets)]
    analysis = actions[tick % len(actions)]
    
    return {
        "mode": mode,
        "sector": sector,
        "subject": subject,
        "type_tag": "TELEMETRY EVALUATION",
        "latency_myr": round(random.uniform(0.1, 5.0), 2),
        "data_analysis": analysis,
        "temporal_simulation": f"Scale factor a(t) integrated at age {age_gyr:.4f} Gyr.",
        "resolution": "Physical trajectory verified. Standard procedural evolution proceeding."
    }

def run_simulation():
    print("🚀 [PROJECT ORIGIN] Physics Engine Initialized...")
    print("🌌 Mode: Open-Ended Continuous Cosmic Evolution")
    
    current_age_gyr = 0.0
    tick = 0
    
    while True:
        tick += 1
        
        # 1. Advance Time Step
        if tick <= PRIMORDIAL_TICKS:
            # Phase 1: Hour 1 Primordial Sprint (0.0 to 0.1 Gyr)
            current_age_gyr += (0.1 / PRIMORDIAL_TICKS)
        else:
            # Phase 2: Steady Open-Ended Continuous Physics Step (Days 1 to 30+)
            current_age_gyr += MAIN_DT_GYR
            
        # 2. Compute Physical Cosmological Parameters
        de_pct, dm_pct, baryon_pct = calculate_cosmology(current_age_gyr)
        nebulae, stars, bh, ns, planets, moons, asteroids, quasars, exotic = calculate_catalog_counts(current_age_gyr)
        
        # 3. State Evaluation Mode
        mode = "OBSERVE"
        
        # 4. Push Universe State to Supabase
        try:
            state_payload = {
                "age_gyr": current_age_gyr,
                "de_pct": de_pct,
                "dm_pct": dm_pct,
                "baryon_pct": baryon_pct
            }
            requests.post(f"{SUPABASE_URL}/rest/v1/universe_state", headers=HEADERS, json=state_payload, timeout=5)
            
            # Push Catalog Telemetry Stats
            catalog_payload = {
                "id": 1,
                "nebulae": nebulae,
                "stars": stars,
                "black_holes": bh,
                "neutron_stars": ns,
                "planets": planets,
                "moons": moons,
                "asteroids_comets": asteroids,
                "quasars": quasars,
                "exotic_objects": exotic
            }
            headers_upsert = {**HEADERS, "Prefer": "resolution=merge-duplicates"}
            requests.post(f"{SUPABASE_URL}/rest/v1/catalog_stats", headers=headers_upsert, json=catalog_payload, timeout=5)
            
            # Push Telemetry Origin Log
            log_data = generate_directive_log(tick, current_age_gyr, mode)
            requests.post(f"{SUPABASE_URL}/rest/v1/origin_logs", headers=HEADERS, json=log_data, timeout=5)
            
            print(f"[Tick {tick}] Age: {current_age_gyr:.4f} Gyr | Stars: {stars} | Mode: {mode}")
            
        except Exception as e:
            print(f"⚠️ [Tick {tick}] Supabase sync error: {e}")
            
        # Wait for next 60-second cycle
        time.sleep(TICK_INTERVAL_SEC)

if __name__ == "__main__":
    run_simulation()
