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

# --- COSMOLOGICAL CONSTANTS & SOLVER ---
C_LIGHT = 299792.458  # km/s
H_0 = 67.4            # Hubble constant
OMEGA_M = 0.315       # Matter density
OMEGA_LAMBDA = 0.685  # Dark energy density

def calculate_cosmology(age_myr):
    age_gyr = max(0.0001, age_myr / 1000.0)
    scale_factor = math.pow(math.sinh(1.5 * math.sqrt(OMEGA_LAMBDA) * (age_gyr / 13.8)), 2.0 / 3.0) if age_gyr > 0 else 0.0001
    scale_factor = max(0.0001, scale_factor)
    redshift = max(0.0, (1.0 / scale_factor) - 1.0)
    h_t = H_0 * math.sqrt(OMEGA_M * math.pow(1.0 + redshift, 3) + OMEGA_LAMBDA)
    horizon_ly = (C_LIGHT / max(1.0, h_t)) * 3.26156e6 * (1.0 + redshift)
    entropy = 1.0 + math.log10(1.0 + age_myr * 1000.0)

    if entropy > 15.0:
        epoch = "Heat Death / Big Freeze Era"
    elif scale_factor > 50.0:
        epoch = "Big Rip Horizon Fragmentation"
    elif age_myr > 1000.0:
        epoch = "Stelliferous Galaxy Era"
    elif age_myr > 0.1:
        epoch = "Cosmic Dark Ages & Reionization"
    else:
        epoch = "Primordial Expansion Era"

    return {
        "scale_factor": scale_factor,
        "redshift": redshift,
        "horizon_ly": horizon_ly,
        "entropy": entropy,
        "epoch": epoch
    }

def fetch_latest_age():
    try:
        res = requests.get(f"{SUPABASE_URL}/rest/v1/universe_state?select=age&order=id.desc&limit=1", headers=HEADERS)
        if res.status_code == 200 and len(res.json()) > 0:
            return float(res.json()[0].get("age", 0.0))
    except Exception as e:
        print(f"[DB FETCH WARNING]: {e}")
    return 0.0

def query_ai_decision(age_myr, cosmology):
    if GROQ_API_KEY:
        prompt = f"""
        You are ORIGIN, the autonomous AI Architect of a real-physics universe simulation.
        CURRENT STATE:
        - Age: {age_myr * 1000000:,.0f} Years
        - Redshift (z): {cosmology['redshift']:.2f}
        - Horizon Radius: {cosmology['horizon_ly']:,.0f} light years
        - Entropy (S): {cosmology['entropy']:.4f}
        - Epoch: {cosmology['epoch']}

        RULES: You cannot bypass light speed/causality horizon. You must obey thermodynamics. You have free will to guide structure formation, foster prebiotic environments, harvest energy, or let entropy take over.
        Output valid JSON only: {{"goal": "<short_goal>", "reasoning": "<scientific_reasoning>"}}
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
                return data.get("goal"), data.get("reasoning")
        except Exception as e:
            print(f"[GROQ AI FALLBACK]: {e}")

    # Dynamic Physics Decision Solver (Fallback)
    if age_myr < 0.1:
        goals = [
            ("Simulating Quantum Inflation & Metric Expansion", "Hot Big Bang nucleosynthesis synthesizing Hydrogen and Helium isotopes."),
            ("Gravitational Collapse along Primordial Filaments", "Quantum density perturbations guiding dark matter potential wells.")
        ]
    elif age_myr < 10.0:
        goals = [
            ("Population III Hypermassive Protostar Ignition", "Jeans Instability collapse triggering initial Population III stellar cores."),
            ("Protogalactic Disk Accretion Alignment", "Dissipating angular momentum in gas streams to seed galactic cores.")
        ]
    else:
        goals = [
            ("Evaluating Circumstellar Habitability Zones", "Monitoring heavy metallicity enrichment in Population II stellar disk systems."),
            ("Supermassive Singularity Mass Accretion", "Accreting baryonic matter into central galactic event horizons.")
        ]
    
    return random.choice(goals)

def sync_to_supabase(age, goal, reasoning, redshift, entropy):
    try:
        payload = {
            "age": age,
            "goal": goal,
            "reasoning": reasoning,
            "redshift": redshift,
            "entropy": entropy
        }
        res = requests.post(f"{SUPABASE_URL}/rest/v1/universe_state", json=payload, headers=HEADERS)
        years = int(age * 1000000)
        print(f"🌌 [ORIGIN AI] Age: {years:,} Yrs | z={redshift:.1f} | Goal: {goal[:35]}... | HTTP {res.status_code}")
    except Exception as e:
        print(f"[SYNC ERROR]: {e}")

def create_event(age, goal_title):
    event_types = ["cosmic", "stellar", "blackhole", "planetary"]
    titles = [
        "🔬 Critical Jeans Density Reached",
        "⚡ Dark Matter Filament Gas Injection",
        "⭐ Core Fusion Hydrostatic Equilibrium",
        "🌀 Relativistic Event Horizon Formation"
    ]
    descs = [
        f"Gas cloud in Sector {random.randint(1,99)} passed gravitational collapse threshold during goal: {goal_title}.",
        f"Intergalactic accretion stream aligned with dark matter halo in Sector {random.randint(1,99)}.",
        f"Stellar nucleus initialized self-sustaining CNO/p-p chain nuclear fusion.",
        f"Singularity mass density passed Schwarzschild radius limit."
    ]
    idx = random.randint(0, len(titles)-1)
    payload = {
        "title": titles[idx],
        "description": descs[idx],
        "type": event_types[idx],
        "age": age
    }
    try:
        requests.post(f"{SUPABASE_URL}/rest/v1/events", json=payload, headers=HEADERS)
    except Exception as e:
        print(f"[EVENT ERROR]: {e}")

def update_catalog(age):
    multiplier = max(0.0, age * 15.0)
    payload = {
        "id": 1,
        "stars": int(multiplier * 450 + (100 if age > 0.001 else 0)),
        "black_holes": int(multiplier * 8),
        "neutron_stars": int(multiplier * 5),
        "planets": int(multiplier * 120)
    }
    try:
        headers = HEADERS.copy()
        headers["Prefer"] = "resolution=merge-duplicates"
        requests.post(f"{SUPABASE_URL}/rest/v1/catalog_stats", json=payload, headers=headers)
    except Exception as e:
        print(f"[CATALOG ERROR]: {e}")

def main():
    print("⚡ [PROJECT ORIGIN] Dynamic Autonomous Physics & AI Engine Active...")
    
    current_age = fetch_latest_age()
    cycle = 0

    while True:
        try:
            # Advance time continuously: 4s = 7,100 Cosmic Years
            current_age += 0.0071
            cosmology = calculate_cosmology(current_age)

            # Query AI/Physics Solver for dynamic goal & reasoning
            goal, reasoning = query_ai_decision(current_age, cosmology)

            sync_to_supabase(current_age, goal, reasoning, cosmology['redshift'], cosmology['entropy'])

            if cycle % 3 == 0:
                create_event(current_age, goal)

            update_catalog(current_age)

            cycle += 1
            time.sleep(4)

        except Exception as e:
            print(f"[CYCLE EXCEPTION]: {e}")
            time.sleep(5)

if __name__ == "__main__":
    main()
