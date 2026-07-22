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

# Cosmological Constants (Lambda-CDM Model)
C_LIGHT = 299792.458
H_0 = 67.4
OMEGA_M = 0.315
OMEGA_LAMBDA = 0.685

# Protogalactic Mass Reservoir (100 Billion Solar Masses M☉)
TOTAL_BARYONIC_MASS = 100_000_000_000.0

# Mass Equivalents per Category (M☉)
CATEGORY_MASS_WEIGHTS = {
    "stars": 1.0,
    "black_holes": 20.0,
    "neutron_stars": 1.4,
    "planets": 0.001,
    "moons": 0.00001,
    "asteroids_comets": 0.0000001,
    "nebulae": 500.0,
    "quasars": 1000.0,
    "dark_matter_structures": 100000.0,
    "exotic_objects": 10.0
}

def calculate_cosmology(age_myr):
    age_gyr = max(0.0001, age_myr / 1000.0)
    scale_factor = math.pow(math.sinh(1.5 * math.sqrt(OMEGA_LAMBDA) * (age_gyr / 13.8)), 2.0 / 3.0) if age_gyr > 0 else 0.0001
    scale_factor = max(0.0001, scale_factor)
    redshift = max(0.0, (1.0 / scale_factor) - 1.0)
    h_t = H_0 * math.sqrt(OMEGA_M * math.pow(1.0 + redshift, 3) + OMEGA_LAMBDA)
    horizon_ly = (C_LIGHT / max(1.0, h_t)) * 3.26156e6 * (1.0 + redshift)
    entropy = 1.0 + math.log10(1.0 + age_myr * 1000.0)

    if age_myr < 0.38:
        epoch = "Primordial Inflation & Recombination"
    elif age_myr < 100.0:
        epoch = "Cosmic Dark Ages"
    elif age_myr < 500.0:
        epoch = "Population III First Stars Ignition"
    elif age_myr < 13800.0:
        epoch = "Stelliferous Galaxy Era"
    elif age_myr < 100000.0:
        epoch = "Degenerate Stellar Era"
    else:
        epoch = "Black Hole Dominance Era"

    return {
        "scale_factor": scale_factor,
        "redshift": redshift,
        "horizon_ly": horizon_ly,
        "entropy": entropy,
        "epoch": epoch
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

def sanitize_and_enforce_physics(mutations, age_myr, current_catalog):
    """
    HARD CODE ENFORCER: Enforces physical limits and prevents unphysical mass creation.
    """
    sanitized = {k: max(0, int(v)) for k, v in mutations.items()}

    # Timeline Gates
    if age_myr < 100.0: # Dark Ages
        for k in ["stars", "black_holes", "neutron_stars", "planets", "moons", "asteroids_comets", "quasars", "exotic_objects"]:
            sanitized[k] = 0
    elif age_myr < 500.0: # Reionization
        for k in ["planets", "moons", "asteroids_comets"]:
            sanitized[k] = 0
    elif age_myr > 13800.0: # Degenerate Era
        sanitized["stars"] = random.randint(0, 1) if random.random() < 0.05 else 0
        sanitized["quasars"] = 0

    # Mass Budget Check across Baryonic Matter
    current_mass_used = sum(current_catalog.get(cat, 0) * weight for cat, weight in CATEGORY_MASS_WEIGHTS.items())

    if current_mass_used >= TOTAL_BARYONIC_MASS * 0.98:
        for k in ["stars", "planets", "moons", "asteroids_comets", "nebulae", "quasars", "exotic_objects"]:
            sanitized[k] = 0

    return sanitized

def query_ai_decision(age_myr, cosmology, current_catalog):
    goal, reasoning, raw_mutations = None, None, {}

    if GROQ_API_KEY:
        prompt = f"""
        You are ORIGIN, an autonomous AI astrophysics engine.
        CURRENT STATE:
        - Age: {age_myr * 1000000:,.0f} Years
        - Epoch: {cosmology['epoch']}

        OUTPUT FORMAT (JSON ONLY):
        {{
            "goal": "<Scientific trajectory, max 10 words>",
            "reasoning": "<Physical catalyst causing this, max 20 words>",
            "mutations": {{
                "stars": <int>, "black_holes": <int>, "neutron_stars": <int>, "planets": <int>,
                "moons": <int>, "asteroids_comets": <int>, "nebulae": <int>, "quasars": <int>,
                "dark_matter_structures": <int>, "exotic_objects": <int>
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
                    "temperature": 0.2,
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
            goal = "Resolving quantum vacuum density fluctuations."
            reasoning = "Isotropic expansion stretching primordial plasma, initiating dark matter halo condensation."
            raw_mutations = {"dark_matter_structures": random.randint(10, 30), "nebulae": random.randint(1, 3)}
        elif age_myr < 500.0:
            goal = "Igniting Population III supermassive protostars."
            reasoning = "Neutral hydrogen cooling within deep potential wells triggers rapid core collapse."
            raw_mutations = {"stars": random.randint(5, 20), "black_holes": random.randint(0, 1), "dark_matter_structures": random.randint(20, 50)}
        elif age_myr < 13800.0:
            goal = "Accelerating galactic disk accretion and metallicity."
            reasoning = "Supernova nucleosynthesis enriching interstellar medium, enabling heavy element planetary formation."
            raw_mutations = {"stars": random.randint(20, 80), "black_holes": random.randint(1, 3), "planets": random.randint(10, 50), "asteroids_comets": random.randint(200, 800)}
        else:
            goal = "Monitoring stellar depletion and heat dissipation."
            reasoning = "Baryonic reservoir exhausted; main sequence star formation halts as remaining objects cool."
            raw_mutations = {"black_holes": random.randint(0, 1)}

    enforced_mutations = sanitize_and_enforce_physics(raw_mutations, age_myr, current_catalog)
    return goal, reasoning, enforced_mutations

def spawn_individual_objects(mutations, age_myr, goal, reasoning):
    """
    PER-OBJECT DATABASE ENGINE: Inserts individual entities into cosmic_objects table.
    """
    new_rows = []
    type_display_names = {
        "stars": "Main Sequence Star System",
        "black_holes": "Stellar Mass Black Hole",
        "neutron_stars": "Degenerate Neutron Core",
        "planets": "Terrestrial Exoplanet",
        "moons": "Natural Satellite",
        "asteroids_comets": "Accretion Fragment",
        "nebulae": "Interstellar Molecular Cloud",
        "quasars": "Active Galactic Nucleus",
        "dark_matter_structures": "Dark Matter Halo Node",
        "exotic_objects": "Relic Gravitational Singularity"
    }

    for category, count in mutations.items():
        if count <= 0:
            continue
        
        sample_size = min(count, 3)
        for i in range(sample_size):
            obj_id = f"OBJ-{random.randint(10000, 99999)}"
            display_type = type_display_names.get(category, "Cosmic Body")
            mass = CATEGORY_MASS_WEIGHTS.get(category, 1.0) * random.uniform(0.8, 1.5)
            
            temp = random.uniform(10, 300) if category in ["nebulae", "dark_matter_structures"] else random.uniform(3000, 50000)
            dist_origin = random.uniform(100, max(500, age_myr * 800))
            
            new_rows.append({
                "id": obj_id,
                "designation": f"{category.upper()[:3]}-{random.randint(100, 999)}",
                "type": display_type,
                "mass_msun": round(mass, 4),
                "temp_k": round(temp, 1),
                "radius_ly": round(random.uniform(0.001, 2.0), 4),
                "dist_origin_ly": round(dist_origin, 1),
                "age_formed_myr": round(age_myr, 2),
                "status": "Active",
                "ai_last_action": goal,
                "ai_last_reason": reasoning
            })

    if new_rows:
        try:
            requests.post(f"{SUPABASE_URL}/rest/v1/cosmic_objects", json=new_rows, headers=HEADERS)
        except Exception as e:
            print(f"[COSMIC OBJECTS WRITE ERROR]: {e}")

def sync_to_supabase(age, goal, reasoning, redshift, entropy, epoch):
    try:
        payload = {"age": age, "goal": goal, "reasoning": reasoning, "redshift": redshift, "entropy": entropy, "epoch": epoch}
        requests.post(f"{SUPABASE_URL}/rest/v1/universe_state", json=payload, headers=HEADERS)
    except Exception:
        pass

def update_catalog_cumulative(current_catalog, mutations):
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
    print("⚡ [ORIGIN Engine] Full Physical Taxonomy & Per-Object Telemetry Online.")
    current_age, current_catalog = fetch_latest_state()

    while True:
        try:
            # Adaptive Logarithmic Step
            delta_age = max(0.05, current_age * 0.004)
            current_age += delta_age
            
            cosmology = calculate_cosmology(current_age)
            goal, reasoning, enforced_mutations = query_ai_decision(current_age, cosmology, current_catalog)

            sync_to_supabase(current_age, goal, reasoning, cosmology['redshift'], cosmology['entropy'], cosmology['epoch'])
            current_catalog = update_catalog_cumulative(current_catalog, enforced_mutations)
            spawn_individual_objects(enforced_mutations, current_age, goal, reasoning)

            years = int(current_age * 1000000)
            print(f"🌌 Age: {years:,} Yrs (+{int(delta_age*1000000):,} Yrs/step) | Epoch: {cosmology['epoch']}")

            time.sleep(4)

        except Exception as e:
            time.sleep(5)

if __name__ == "__main__":
    main()
EOF

pkill -f runner.py ; nohup python3 -u server/runner.py > runner.log 2>&1 &
