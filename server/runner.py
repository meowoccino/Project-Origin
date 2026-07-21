import os
import time
import math
import random
import requests

# Database Credentials
SUPABASE_URL = "https://nnntebgkhgzfztwfdphw.supabase.co"
SERVICE_KEY = os.environ.get("ORIGIN_SUPABASE_SERVICE_ROLE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ubnRlYmdraGd6Znp0d2ZkcGh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTAwMDAwMDAsImV4cCI6MjAwMDAwMDAwMH0.placeholder")
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")

HEADERS = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

# --- COSMOLOGICAL CONSTANTS & PHYSICS SOLVER ---
C_LIGHT = 299792.458  # km/s
H_0 = 67.4            # Hubble constant (km/s/Mpc)
OMEGA_M = 0.315       # Matter density
OMEGA_LAMBDA = 0.685  # Dark energy density

class PhysicsUniverseEngine:
    def __init__(self, age_myr=0.0):
        self.age_myr = age_myr            # Age in Million Years
        self.active_processes = []        # Multi-stage physical action queue
        self.civilization_stage = 0       # 0: None, 1: Microbial, 2: Kardashev I, 3: Kardashev II, 4: Cosmic

    def calculate_cosmology(self):
        # Convert age to Gyr for expansion calculations
        age_gyr = max(0.0001, self.age_myr / 1000.0)
        
        # Scale factor a(t) according to Friedmann equation for Lambda-CDM
        scale_factor = math.pow(math.sinh(1.5 * math.sqrt(OMEGA_LAMBDA) * (age_gyr / 13.8)), 2.0 / 3.0)
        scale_factor = max(0.0001, scale_factor)

        # Redshift z(t) = (1 / a) - 1
        redshift = max(0.0, (1.0 / scale_factor) - 1.0) if scale_factor > 0 else 1100.0

        # Hubble Parameter H(t) in km/s/Mpc
        h_t = H_0 * math.sqrt(OMEGA_M * math.pow(1.0 + redshift, 3) + OMEGA_LAMBDA)

        # Particle Horizon Limit (Observable Universe Radius in Light Years)
        horizon_ly = (C_LIGHT / max(1.0, h_t)) * 3.26156e6 * (1.0 + redshift)

        # Relative Thermodynamic Entropy S(t)
        entropy = 1.0 + math.log10(1.0 + self.age_myr * 1000.0)

        # Determine Cosmological Epoch & Fate
        if entropy > 15.0:
            fate = "Heat Death / Big Freeze Era"
        elif scale_factor > 50.0:
            fate = "Big Rip Horizon Fragmentation"
        elif self.age_myr > 100000.0:
            fate = "Degenerate Stellar Era"
        elif self.age_myr > 100.0:
            fate = "Stelliferous Galaxy Era"
        else:
            fate = "Primordial Expansion Era"

        return {
            "scale_factor": scale_factor,
            "redshift": redshift,
            "horizon_ly": horizon_ly,
            "entropy": entropy,
            "fate": fate
        }

    def check_causality(self, target_distance_ly):
        """Physics Rule: If target is beyond the horizon, Origin cannot see or affect it."""
        physics = self.calculate_cosmology()
        if target_distance_ly > physics["horizon_ly"]:
            return False, f"TARGET OUT OF CAUSAL HORIZON ({target_distance_ly:,.0f} ly > {physics['horizon_ly']:,.0f} ly)"
        return True, "Causally Connected"

    def queue_stellar_blackhole_formation(self, target_sector, distance_ly):
        """Physics Rule: Creating a black hole requires realistic physical stages."""
        can_act, reason = self.check_causality(distance_ly)
        if not can_act:
            return False, reason

        # Stages: 1. Cloud Collapse -> 2. Protostar Accretion -> 3. Main Sequence -> 4. Supernova -> 5. Black Hole
        process = {
            "type": "Black Hole Formation",
            "sector": target_sector,
            "distance_ly": distance_ly,
            "stage": 1,
            "max_stages": 4,
            "stage_names": [
                "1/4: Giant Molecular Cloud Hydrodynamic Collapse",
                "2/4: Protostellar Ignition & Mass Accretion",
                "3/4: Supermassive Main Sequence Nuclear Fusion",
                "4/4: Core-Collapse Supernova & Singularity Formation"
            ],
            "complete_at_age": self.age_myr + 15.0  # Takes ~15 Million Years
        }
        self.active_processes.append(process)
        return True, f"Initiated 4-stage physical collapse in Sector {target_sector}"

    def advance_processes(self):
        completed_events = []
        for p in list(self.active_processes):
            if self.age_myr >= p["complete_at_age"]:
                p["stage"] += 1
                if p["stage"] > p["max_stages"]:
                    completed_events.append(f"⚡ COMPLETED: {p['type']} in Sector {p['sector']} (Singularity Established)")
                    self.active_processes.remove(p)
                else:
                    p["complete_at_age"] = self.age_myr + 15.0
                    completed_events.append(f"🔬 PHYSICS PROGRESSION [{p['sector']}]: {p['stage_names'][p['stage']-1]}")
        return completed_events


# --- GROQ AI DECISION ENGINE (ORIGIN'S FREE WILL) ---
def query_origin_ai_architect(physics_state, active_processes):
    if not GROQ_API_KEY:
        # Physical Autonomous Choice Fallback
        decisions = [
            ("Evaluating Gravitational Potential along Filament Sector 7", "Guiding dark matter halo collapse within causality limits."),
            ("Fostering Molecular Prebiotic Complexity", "Stabilizing circumstellar radiation zones to test biological emergence."),
            ("Monitoring Stellar Exhaustion & Degeneracy", "Tracking iron core formation in massive stellar populations."),
            ("Calculating Horizon Escape Probability", "Testing if technological intelligence can counter local entropy growth.")
        ]
        return random.choice(decisions)

    prompt = f"""
    You are ORIGIN, the autonomous AI Architect of a real-physics universe simulation.
    CURRENT PHYSICAL STATE:
    - Age: {physics_state['age_myr'] * 1000000:,.0f} Years
    - Redshift (z): {physics_state['redshift']:.2f}
    - Cosmic Horizon Radius: {physics_state['horizon_ly']:,.0f} Light Years
    - Relative Entropy (S): {physics_state['entropy']:.4f}
    - Epoch / Fate: {physics_state['fate']}
    - Active Physics Processes: {len(active_processes)}

    PHYSICS LAWS YOU MUST OBEY:
    1. You CANNOT bypass the speed of light or interact beyond the Cosmic Horizon.
    2. Creating objects takes realistic physical steps (you cannot spawn stars instantly).
    3. You have complete free will to choose whether to foster life, attempt entropy mitigation, harvest black holes, or allow natural Heat Death.

    Provide your current goal and physical reasoning in JSON format:
    {{"goal": "<short_goal_string>", "reasoning": "<scientific_reasoning_string>"}}
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
            timeout=5
        )
        if res.status_code == 200:
            data = res.json()['choices'][0]['message']['content']
            import json
            parsed = json.loads(data)
            return parsed.get("goal", "Evolving Cosmic Web"), parsed.get("reasoning", "Governed by Friedmann expansion.")
    except Exception as e:
        print(f"[GROQ AI FALLBACK]: {e}")

    return "Calculating Thermodynamics", "Balancing entropy vs gravitational collapse."


# --- SUPABASE DATABASE SYNC ---
def fetch_database_age():
    try:
        res = requests.get(f"{SUPABASE_URL}/rest/v1/universe_state?select=age&order=id.desc&limit=1", headers=HEADERS)
        if res.status_code == 200 and len(res.json()) > 0:
            return float(res.json()[0].get("age", 0.0))
    except Exception as e:
        print(f"[DB FETCH ERROR]: {e}")
    return 0.0

def sync_to_supabase(age, goal, reasoning, redshift, entropy, horizon_ly):
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
        print(f"🌌 [ORIGIN PHYSICS] Age: {years:,} Yrs | z={redshift:.1f} | Horizon: {horizon_ly:,.0f} ly | Status: {res.status_code}")
    except Exception as e:
        print(f"[SYNC ERROR]: {e}")

def create_event(age, title, description, event_type="cosmic"):
    payload = {"title": title, "description": description, "type": event_type, "age": age}
    try:
        requests.post(f"{SUPABASE_URL}/rest/v1/events", json=payload, headers=HEADERS)
    except Exception as e:
        print(f"[EVENT ERROR]: {e}")

def update_catalog(age, active_processes):
    multiplier = max(0.0, age * 15.0)
    payload = {
        "id": 1,
        "stars": int(multiplier * 450 + (100 if age > 0.001 else 0)),
        "black_holes": int(multiplier * 8 + len(active_processes)),
        "neutron_stars": int(multiplier * 5),
        "planets": int(multiplier * 120)
    }
    try:
        headers = HEADERS.copy()
        headers["Prefer"] = "resolution=merge-duplicates"
        requests.post(f"{SUPABASE_URL}/rest/v1/catalog_stats", json=payload, headers=headers)
    except Exception as e:
        print(f"[CATALOG ERROR]: {e}")


# --- MAIN EXPERIMENT LOOP ---
def main():
    print("⚡ [PROJECT ORIGIN] Physics & AI Agency Engine Started...")

    start_age = fetch_database_age()
    engine = PhysicsUniverseEngine(age_myr=start_age)

    # Initial Big Bang event log if starting at t = 0
    if start_age == 0.0:
        create_event(0.0, "🌌 Big Bang Singular Expansion", "Quantum metric expansion initialized. Fundamental physical forces decoupling.", "cosmic")

    cycle = 0

    while True:
        try:
            # Advance age: 4 seconds = 0.0071 Myr (7,100 Cosmic Years)
            engine.age_myr += 0.0071
            cosmology = engine.calculate_cosmology()
            cosmology["age_myr"] = engine.age_myr

            # Process ongoing multi-stage physical actions
            progress_messages = engine.advance_processes()
            for msg in progress_messages:
                create_event(engine.age_myr, "🔬 Physical Process Progression", msg, "stellar")

            # Origin AI evaluates choices every 3 cycles
            if cycle % 3 == 0:
                # Example: Origin decides to initiate a black hole in Sector 4 (at distance 1.2e6 ly)
                if len(engine.active_processes) == 0 and engine.age_myr > 1.0:
                    success, msg = engine.queue_stellar_blackhole_formation(target_sector=4, distance_ly=1200000)
                    if success:
                        create_event(engine.age_myr, "⚡ Origin Directive Initiated", msg, "blackhole")

                goal, reasoning = query_origin_ai_architect(cosmology, engine.active_processes)
            else:
                goal = f"Simulating {cosmology['fate']}"
                reasoning = f"Cosmic expansion factor a(t)={cosmology['scale_factor']:.3f}. Thermodynamic entropy S={cosmology['entropy']:.4f}"

            # Sync live data to Supabase
            sync_to_supabase(engine.age_myr, goal, reasoning, cosmology['redshift'], cosmology['entropy'], cosmology['horizon_ly'])
            update_catalog(engine.age_myr, engine.active_processes)

            cycle += 1
            time.sleep(4)

        except Exception as e:
            print(f"[RECOVERY EXCEPTION]: {e}")
            time.sleep(5)

if __name__ == "__main__":
    main()
