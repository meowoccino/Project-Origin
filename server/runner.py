cd ~/Project-Origin && cat << 'EOF' > server/runner.py
import os
import time
import math
import random
import requests
import json

SUPABASE_URL = "https://nnntebgkhgzfztwfdphw.supabase.co"
SUPABASE_KEY = os.environ.get("ORIGIN_SUPABASE_SERVICE_ROLE_KEY", "sb_publishable_O5qr-6UD-6wTzi51j3tYtw_00N9Q4ja")
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

# Cosmological Constants
C_LIGHT = 299792.458
H_0 = 67.4
OMEGA_M_0 = 0.315
OMEGA_LAMBDA_0 = 0.685
OMEGA_DM_0 = 0.264

CATEGORY_MASS_WEIGHTS = {
    "stars": 1.0, "black_holes": 20.0, "neutron_stars": 1.4, "planets": 0.001,
    "moons": 0.00001, "asteroids_comets": 0.0000001, "nebulae": 500.0,
    "quasars": 1000.0, "dark_matter_structures": 100000.0, "exotic_objects": 10.0
}

# Free Will Object Naming Arrays
NAME_PREFIXES = ["Vespera", "Aetheria", "Erebus", "Hyperion", "Chronos", "Ignis", "Thalassa", "Zephyrus", "Kaelum", "Onyx", "Solaria", "Astraea"]
NAME_SUFFIXES = ["Prime", "Core", "Singularity", "Halo", "Filament", "Cluster", "Nebula", "Vortex", "Node", "Nursery", "Nexus", "Relic"]

LOGGED_MILESTONES = set()

def calculate_cosmology(age_myr):
    age_gyr = max(0.0001, age_myr / 1000.0)
    scale_factor = math.pow(math.sinh(1.5 * math.sqrt(OMEGA_LAMBDA_0) * (age_gyr / 13.8)), 2.0 / 3.0) if age_gyr > 0 else 0.0001
    scale_factor = max(0.0001, scale_factor)
    redshift = max(0.0, (1.0 / scale_factor) - 1.0)
    
    e_z_sq = OMEGA_M_0 * math.pow(1.0 + redshift, 3) + OMEGA_LAMBDA_0
    de_pct = round((OMEGA_LAMBDA_0 / e_z_sq) * 100.0, 1)
    dm_pct = round(((OMEGA_DM_0 * math.pow(1.0 + redshift, 3)) / e_z_sq) * 100.0, 1)
    baryon_pct = round(max(0.1, 100.0 - de_pct - dm_pct), 1)

    if age_myr < 0.38:
        epoch = "Primordial Inflation & Recombination"
    elif age_myr < 100.0:
        epoch = "Cosmic Dark Ages"
    elif age_myr < 500.0:
        epoch = "Population III First Stars Ignition"
    elif age_myr < 13800.0:
        epoch = "Stelliferous Galaxy Era"
    else:
        epoch = "Degenerate Stellar Era"

    return {
        "scale_factor": scale_factor,
        "redshift": redshift,
        "epoch": epoch,
        "de_pct": de_pct,
        "dm_pct": dm_pct,
        "baryon_pct": baryon_pct
    }

def fetch_latest_state():
    age = 0.0
    catalog = {k: 0 for k in CATEGORY_MASS_WEIGHTS.keys()}
    try:
        res_age = requests.get(f"{SUPABASE_URL}/rest/v1/universe_state?select=age&order=id.desc&limit=1", headers=HEADERS)
        if res_age.status_code == 200 and len(res_age.json()) > 0:
            age = float(res_age.json()[0].get("age", 0.0))
        
        res_cat = requests.get(f"{SUPABASE_URL}/rest/v1/catalog_stats?select=*&limit=1", headers=HEADERS)
        if res_cat.status_code == 200 and len(res_cat.json()) > 0:
            data = res_cat.json()[0]
            for key in catalog.keys():
                catalog[key] = data.get(key, 0)
    except Exception as e:
        print(f"[DB FETCH WARNING]: {e}")
    return age, catalog

def generate_creative_object_name(category):
    prefix = random.choice(NAME_PREFIXES)
    suffix = random.choice(NAME_SUFFIXES)
    num = random.randint(1, 99)
    return f"{prefix} {suffix} {num}"

def sanitize_and_apply_lifecycle(mutations, age_myr, current_catalog):
    sanitized = {k: int(v) for k, v in mutations.items()}

    if age_myr < 100.0:
        for k in ["stars", "black_holes", "neutron_stars", "planets", "moons", "asteroids_comets", "quasars", "exotic_objects"]:
            sanitized[k] = 0
    elif age_myr < 500.0:
        for k in ["planets", "moons", "asteroids_comets"]:
            sanitized[k] = 0

    return sanitized

def query_ai_decision(age_myr, cosmology, current_catalog):
    goal, reasoning, raw_mutations = None, None, {}

    target_name = generate_creative_object_name("stars")

    if GROQ_API_KEY:
        prompt = f"""
        You are ORIGIN, an autonomous AI astrophysics engine with free will.
        CURRENT UNIVERSE STATE:
        - Age: {age_myr * 1000000:,.0f} Years
        - Epoch: {cosmology['epoch']}

        Generate a scientific action naming specific cosmic objects (e.g., '{target_name}').
        OUTPUT JSON ONLY:
        {{
            "goal": "<Trajectory involving a named object, max 10 words>",
            "reasoning": "<Physical catalyst, max 20 words>",
            "mutations": {{ "stars": <int>, "black_holes": <int>, "dark_matter_structures": <int>, "nebulae": <int> }}
        }}
        """
        try:
            res = requests.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"},
                json={
                    "model": "llama3-8b-8192",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.4,
                    "response_format": {"type": "json_object"}
                },
                timeout=6
            )
            if res.status_code == 200:
                data = json.loads(res.json()['choices'][0]['message']['content'])
                goal = data.get("goal")
                reasoning = data.get("reasoning")
                raw_mutations = data.get("mutations", {})
        except Exception:
            pass

    if not goal or not reasoning:
        if age_myr < 100.0:
            goal = f"Condensing dark matter halo '{target_name}'."
            reasoning = "Isotropic expansion stretching primordial plasma, initiating gravitational instability."
            raw_mutations = {"dark_matter_structures": random.randint(10, 30), "nebulae": random.randint(1, 3)}
        elif age_myr < 500.0:
            goal = f"Igniting Population III star '{target_name}'."
            reasoning = "Neutral hydrogen cooling within molecular cloud triggers rapid runaway core collapse."
            raw_mutations = {"stars": random.randint(5, 20), "black_holes": random.randint(0, 1), "nebulae": random.randint(2, 6)}
        else:
            goal = f"Accreting disk mass around '{target_name}'."
            reasoning = "Supernova nucleosynthesis enriching interstellar medium with heavy elements."
            raw_mutations = {"stars": random.randint(10, 40), "planets": random.randint(5, 20)}

    enforced_mutations = sanitize_and_apply_lifecycle(raw_mutations, age_myr, current_catalog)
    return goal, reasoning, enforced_mutations

def log_milestone_events_once(age_myr, epoch):
    """
    STRICT DEDUPLICATION: Logs each major cosmological milestone EXACTLY ONCE per universe run.
    """
    milestone_key = None
    event_payload = None

    if 0.35 <= age_myr <= 0.45 and "cmb" not in LOGGED_MILESTONES:
        milestone_key = "cmb"
        event_payload = {
            "title": "Photon Decoupling & Cosmic Microwave Background",
            "description": "Thermal baryonic plasma cools below 3,000 K, allowing free photon propagation across expanding space-time.",
            "age": age_myr
        }
    elif 99.0 <= age_myr <= 102.0 and "dark_ages_end" not in LOGGED_MILESTONES:
        milestone_key = "dark_ages_end"
        halo_name = generate_creative_object_name("dark_matter")
        event_payload = {
            "title": f"First Halo Condensation: {halo_name}",
            "description": f"Non-baryonic dark matter halo '{halo_name}' achieves gravitational collapse threshold, ending the Cosmic Dark Ages.",
            "age": age_myr
        }
    elif 490.0 <= age_myr <= 510.0 and "pop3_peak" not in LOGGED_MILESTONES:
        milestone_key = "pop3_peak"
        star_name = generate_creative_object_name("stars")
        event_payload = {
            "title": f"Population III Ignition: {star_name}",
            "description": f"Zero-metallicity hypermassive protostar '{star_name}' ignites, triggering universe-wide reionization.",
            "age": age_myr
        }

    if milestone_key and event_payload:
        try:
            res = requests.post(f"{SUPABASE_URL}/rest/v1/events", json=event_payload, headers=HEADERS)
            if res.status_code in [200, 201]:
                LOGGED_MILESTONES.add(milestone_key)
        except Exception as e:
            print(f"[EVENT LOG ERROR]: {e}")

def sync_to_supabase(age, goal, reasoning, redshift, epoch, de_pct, dm_pct, baryon_pct):
    try:
        payload = {
            "age": age,
            "goal": goal,
            "reasoning": reasoning,
            "redshift": redshift,
            "epoch": epoch,
            "de_pct": de_pct,
            "dm_pct": dm_pct,
            "baryon_pct": baryon_pct
        }
        requests.post(f"{SUPABASE_URL}/rest/v1/universe_state", json=payload, headers=HEADERS)
    except Exception:
        pass

def update_catalog_active_counts(current_catalog, mutations):
    payload = {"id": 1}
    for key in current_catalog.keys():
        payload[key] = max(0, current_catalog.get(key, 0) + mutations.get(key, 0))
    
    try:
        headers = HEADERS.copy()
        headers["Prefer"] = "resolution=merge-duplicates"
        requests.post(f"{SUPABASE_URL}/rest/v1/catalog_stats", json=payload, headers=headers)
        return payload
    except Exception:
        return current_catalog

def main():
    print("⚡ [ORIGIN Engine] Dynamic Telemetry & Deduplicated Event Chronicle Active.")
    current_age, current_catalog = fetch_latest_state()

    while True:
        try:
            delta_age = max(0.05, current_age * 0.004)
            current_age += delta_age
            
            cosmology = calculate_cosmology(current_age)
            goal, reasoning, enforced_mutations = query_ai_decision(current_age, cosmology, current_catalog)

            sync_to_supabase(
                current_age, goal, reasoning, 
                cosmology['redshift'], cosmology['epoch'],
                cosmology['de_pct'], cosmology['dm_pct'], cosmology['baryon_pct']
            )
            current_catalog = update_catalog_active_counts(current_catalog, enforced_mutations)
            log_milestone_events_once(current_age, cosmology['epoch'])

            years = int(current_age * 1000000)
            print(f"🌌 Age: {years:,} Yrs | Action: {goal}")

            time.sleep(4)

        except Exception as e:
            time.sleep(5)

if __name__ == "__main__":
    main()
EOF

pkill -f runner.py ; nohup python3 -u server/runner.py > runner.log 2>&1 &
