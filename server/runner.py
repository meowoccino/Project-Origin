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

OMEGA_M_0 = 0.315
OMEGA_LAMBDA_0 = 0.685
OMEGA_DM_0 = 0.264

NAME_PREFIXES = ["Vespera", "Aetheria", "Erebus", "Hyperion", "Chronos", "Ignis", "Thalassa", "Zephyrus", "Kaelum", "Onyx", "Solaria"]
NAME_SUFFIXES = ["Prime", "Core", "Singularity", "Halo", "Filament", "Cluster", "Nebula", "Vortex", "Node", "Engine", "Horizon"]

def calculate_cosmology(age_myr):
    age_gyr = max(0.0001, age_myr / 1000.0)
    scale_factor = math.pow(math.sinh(1.5 * math.sqrt(OMEGA_LAMBDA_0) * (age_gyr / 13.8)), 2.0 / 3.0) if age_gyr > 0 else 0.0001
    scale_factor = max(0.0001, scale_factor)
    redshift = max(0.0, (1.0 / scale_factor) - 1.0)
    
    e_z_sq = OMEGA_M_0 * math.pow(1.0 + redshift, 3) + OMEGA_LAMBDA_0
    de_pct = round((OMEGA_LAMBDA_0 / e_z_sq) * 100.0, 2) if e_z_sq > 0 else 99.9
    dm_pct = round(((OMEGA_DM_0 * math.pow(1.0 + redshift, 3)) / e_z_sq) * 100.0, 1) if e_z_sq > 0 else 0.1
    baryon_pct = round(max(0.01, 100.0 - de_pct - dm_pct), 2)

    if age_myr < 0.38:
        epoch = "Primordial Recombination"
    elif age_myr < 100.0:
        epoch = "Cosmic Dark Ages"
    elif age_myr < 500.0:
        epoch = "Population III Ignition"
    elif age_myr <= 13800.0:
        epoch = "Stelliferous Era"
    elif age_myr <= 1000000.0:
        epoch = "Degenerate Stellar Era"
    else:
        epoch = "Heat Death Horizon"

    return {"scale_factor": scale_factor, "redshift": redshift, "epoch": epoch, "de_pct": min(100.0, de_pct), "dm_pct": max(0.0, dm_pct), "baryon_pct": max(0.0, baryon_pct)}

def fetch_latest_state():
    age = 0.0
    catalog = {}
    try:
        res_age = requests.get(f"{SUPABASE_URL}/rest/v1/universe_state?select=age&order=id.desc&limit=1", headers=HEADERS)
        if res_age.status_code == 200 and len(res_age.json()) > 0: age = float(res_age.json()[0].get("age", 0.0))
        
        res_cat = requests.get(f"{SUPABASE_URL}/rest/v1/catalog_stats?select=*&limit=1", headers=HEADERS)
        if res_cat.status_code == 200 and len(res_cat.json()) > 0: catalog = res_cat.json()[0]
    except Exception: pass
    return age, catalog

def query_ai_decision(age_myr, cosmology):
    obj_name = f"{random.choice(NAME_PREFIXES)} {random.choice(NAME_SUFFIXES)} {random.randint(1, 999)}"
    goal, reasoning, raw_mutations = None, None, {}

    if GROQ_API_KEY:
        prompt = f"""You are ORIGIN, an autonomous cosmic AI. CURRENT STATE: Age {age_myr:.2f} Myr | Epoch: {cosmology['epoch']}. STRICT JSON ONLY: {{ "goal": "<Action ref {obj_name}, max 10 words>", "reasoning": "<Catalyst, max 20 words>", "mutations": {{ "stars": <int>, "black_holes": <int>, "planets": <int>, "nebulae": <int> }} }}"""
        try:
            res = requests.post("https://api.groq.com/openai/v1/chat/completions", headers={"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"}, json={"model": "llama3-8b-8192", "messages": [{"role": "user", "content": prompt}], "temperature": 0.7, "response_format": {"type": "json_object"}}, timeout=6)
            if res.status_code == 200:
                data = json.loads(res.json()['choices'][0]['message']['content'])
                goal, reasoning, raw_mutations = data.get("goal"), data.get("reasoning"), data.get("mutations", {})
        except Exception: pass

    if not goal:
        if age_myr < 100.0:
            goal, reasoning, raw_mutations = f"Condensing halo '{obj_name}'", "Expansion stretching perturbations into potential wells.", {"dark_matter_structures": random.randint(15, 40), "nebulae": random.randint(1, 3)}
        elif age_myr < 500.0:
            goal, reasoning, raw_mutations = f"Igniting protostar '{obj_name}'", "Zero-metallicity hydrogen cooling induces core collapse.", {"stars": random.randint(10, 30), "black_holes": random.randint(0, 2)}
        else:
            goal, reasoning, raw_mutations = f"Accreting disk at '{obj_name}'", "Supernova nucleosynthesis enriching interstellar medium.", {"stars": random.randint(15, 50), "planets": random.randint(10, 40), "asteroids_comets": random.randint(50, 200)}

    try: requests.post(f"{SUPABASE_URL}/rest/v1/events", json={"title": goal, "description": reasoning, "age": age_myr}, headers=HEADERS)
    except Exception: pass
    return goal, reasoning, {k: int(v) for k, v in raw_mutations.items()}

def main():
    print("⚡ [ORIGIN Engine] Live State Synchronization Active.")
    current_age, current_catalog = fetch_latest_state()

    while True:
        try:
            delta_age = max(10.0, current_age * 0.05)
            current_age += delta_age
            cosmo = calculate_cosmology(current_age)
            goal, reason, muts = query_ai_decision(current_age, cosmo)

            requests.post(f"{SUPABASE_URL}/rest/v1/universe_state", json={"age": current_age, "goal": goal, "reasoning": reason, "redshift": cosmo['redshift'], "epoch": cosmo['epoch'], "de_pct": cosmo['de_pct'], "dm_pct": cosmo['dm_pct'], "baryon_pct": cosmo['baryon_pct']}, headers=HEADERS)
            
            payload = {"id": 1}
            for k in muts.keys(): payload[k] = max(0, current_catalog.get(k, 0) + muts.get(k, 0))
            headers = HEADERS.copy(); headers["Prefer"] = "resolution=merge-duplicates"
            requests.post(f"{SUPABASE_URL}/rest/v1/catalog_stats", json=payload, headers=headers)
            current_catalog.update(payload)
            
            print(f"🌌 Age: {current_age:.2f} Myr | Action: {goal}")
            time.sleep(2.5)
        except Exception: time.sleep(4)

if __name__ == "__main__": main()
