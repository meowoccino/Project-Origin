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

def calculate_cosmology(age_myr):
    age_gyr = max(0.0001, age_myr / 1000.0)
    scale_factor = math.pow(math.sinh(1.5 * math.sqrt(OMEGA_LAMBDA_0) * (age_gyr / 13.8)), 2.0 / 3.0) if age_gyr > 0 else 0.0001
    scale_factor = max(0.0001, scale_factor)
    redshift = max(0.0, (1.0 / scale_factor) - 1.0)
    
    e_z_sq = OMEGA_M_0 * math.pow(1.0 + redshift, 3) + OMEGA_LAMBDA_0
    de_pct = round((OMEGA_LAMBDA_0 / e_z_sq) * 100.0, 2)
    dm_pct = round(((OMEGA_DM_0 * math.pow(1.0 + redshift, 3)) / e_z_sq) * 100.0, 1)
    baryon_pct = round(max(0.1, 100.0 - de_pct - dm_pct), 1)

    if age_myr < 0.38:
        epoch = "Primordial Recombination"
    elif age_myr < 100.0:
        epoch = "Cosmic Dark Ages"
    elif age_myr < 500.0:
        epoch = "Population III Ignition"
    elif age_myr < 13800.0:
        epoch = "Stelliferous Era"
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

def query_ai_decision(age_myr, cosmology, current_catalog):
    """
    TOTAL AI AGENCY: Generates unconstrained actions, creative object designations,
    and physical catalysts via Groq LLM (or procedural free-form synthesis).
    """
    goal, reasoning, raw_mutations = None, None, {}

    if GROQ_API_KEY:
        prompt = f"""
        You are ORIGIN, an autonomous cosmic AI with free will directing physical evolution.
        CURRENT STATE:
        - Universe Age: {age_myr * 1000000:,.0f} Years ({age_myr:.2f} Myr)
        - Epoch: {cosmology['epoch']}
        - Redshift z: {cosmology['redshift']:.2f}

        Free Will Directives:
        1. Invent an original, specific cosmic object designation (e.g. 'Aetheria Cluster 9', 'Ignis-7 Protostar', 'Erebus Singularity').
        2. Describe the physical action/trajectory being performed on or by this object.
        3. Formulate the precise astrophysical catalyst driving it.

        RESPOND IN STRICT JSON ONLY:
        {{
            "goal": "<Action referencing your custom object name, max 10 words>",
            "reasoning": "<Astrophysical catalyst, max 20 words>",
            "mutations": {{
                "stars": <int>, "black_holes": <int>, "neutron_stars": <int>,
                "planets": <int>, "moons": <int>, "asteroids_comets": <int>,
                "nebulae": <int>, "quasars": <int>, "dark_matter_structures": <int>, "exotic_objects": <int>
            }}
        }}
        """
        try:
            res = requests.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"},
                json={
                    "model": "llama3-8b-8192",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.7,
                    "response_format": {"type": "json_object"}
                },
                timeout=6
            )
            if res.status_code == 200:
                data = json.loads(res.json()['choices'][0]['message']['content'])
                goal = data.get("goal")
                reasoning = data.get("reasoning")
                raw_mutations = data.get("mutations", {})
        except Exception as e:
            print(f"[GROQ API WARNING]: {e}")

    # Pure Procedural Fallback with AI-Style Naming Freedom
    if not goal or not reasoning:
        prefixes = ["Vespera", "Aetheria", "Erebus", "Hyperion", "Chronos", "Ignis", "Thalassa", "Zephyrus", "Kaelum", "Onyx"]
        suffixes = ["Prime", "Core", "Singularity", "Halo", "Filament", "Cluster", "Nebula", "Vortex", "Node", "Nursery"]
        custom_name = f"{random.choice(prefixes)} {random.choice(suffixes)} {random.randint(1, 999)}"

        if age_myr < 100.0:
            goal = f"Condensing primordial dark matter halo '{custom_name}'."
            reasoning = "Isotropic space-time expansion stretching density perturbations into potential wells."
            raw_mutations = {"dark_matter_structures": random.randint(10, 35), "nebulae": random.randint(1, 4)}
        elif age_myr < 500.0:
            goal = f"Triggering zero-metallicity ignition in '{custom_name}'."
            reasoning = "Lyman-alpha cooling within molecular cloud induces rapid hydrostatic core collapse."
            raw_mutations = {"stars": random.randint(5, 25), "black_holes": random.randint(0, 2), "nebulae": random.randint(2, 6)}
        else:
            goal = f"Accreting disk metallicity surrounding '{custom_name}'."
            reasoning = "Supernova nucleosynthesis enriching interstellar medium with heavy elements."
            raw_mutations = {"stars": random.randint(15, 50), "planets": random.randint(10, 40), "asteroids_comets": random.randint(50, 200)}

    # Enforce non-negative counts
    sanitized = {k: max(0, int(v)) for k, v in raw_mutations.items()}

    # Log action to Events stream
    try:
        requests.post(f"{SUPABASE_URL}/rest/v1/events", json={
            "title": goal,
            "description": reasoning,
            "age": age_myr
        }, headers=HEADERS)
    except Exception:
        pass

    return goal, reasoning, sanitized

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
    print("⚡ [ORIGIN Engine] Unconstrained AI Free Will Engine Active.")
    current_age, current_catalog = fetch_latest_state()

    while True:
        try:
            delta_age = max(25.0, current_age * 0.08)
            current_age += delta_age
            
            cosmology = calculate_cosmology(current_age)
            goal, reasoning, enforced_mutations = query_ai_decision(current_age, cosmology, current_catalog)

            sync_to_supabase(
                current_age, goal, reasoning, 
                cosmology['redshift'], cosmology['epoch'],
                cosmology['de_pct'], cosmology['dm_pct'], cosmology['baryon_pct']
            )
            current_catalog = update_catalog_active_counts(current_catalog, enforced_mutations)

            years = int(current_age * 1000000)
            print(f"🌌 Age: {years:,} Yrs | Action: {goal}")

            time.sleep(2.5)

        except Exception as e:
            print(f"[ENGINE LOOP ERROR]: {e}")
            time.sleep(4)

if __name__ == "__main__":
    main()
EOF

pkill -f runner.py ; nohup python3 -u server/runner.py > runner.log 2>&1 &
