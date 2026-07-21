import os
import time
import json
import random
import requests
from supabase import create_client, Client

# --- 1. DATABASE SETUP (SUPABASE) ---
SUPABASE_URL = "https://nnntebgkhgzfztwfdphw.supabase.co"
SUPABASE_KEY = "sb_publishable_O5qr-6UD-6wTzi51j3tYtw_00N9Q4ja"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# --- 2. GROQ FREE API SETUP ---
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
# Set environment variable GROQ_API_KEY or paste your key below
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "YOUR_FREE_GROQ_API_KEY_HERE")

# --- 3. DYNAMIC 8-ATTRIBUTE TELEMETRY GENERATOR ---
OBJECT_TYPES = [
    "MICROMETEORITE_CLUSTER", "ATMOSPHERIC_DEBRIS", "COMET_NUCLEUS", 
    "ROGUE_PLANET", "STELLAR_FLARE_EMISSION", "BINARY_STAR_SYSTEM",
    "DARK_MATTER_HALO_NODE", "PROTO_PLANETARY_DISK"
]

def generate_telemetry_event(cosmic_age):
    """Generates dynamic physical telemetry using the 8 core state attributes."""
    return {
        "event_id": f"EVT-{random.randint(1000, 9999)}",
        "cosmic_age_myr": round(cosmic_age, 5),
        "primary_entity": {
            "type": random.choice(OBJECT_TYPES),
            "position_vec3": [round(random.uniform(-500, 500), 2) for _ in range(3)],  # 1. Position
            "velocity_vec3": [round(random.uniform(-50, 50), 2) for _ in range(3)],   # 2. Velocity
            "mass_kg": f"10^{random.randint(10, 28)}",                                 # 3. Mass
            "charge_coulomb": round(random.uniform(-1.0, 1.0), 3),                    # 4. Charge
            "scale_radius_km": round(random.uniform(0.1, 5000.0), 1),                 # 5. Scale
            "composition": random.choice(["Baryonic_Metal", "Hydrogen_Gas", "Dark_Matter"]), # 6. Composition
            "entropy_decay": round(random.uniform(0.01, 0.99), 2),                    # 7. Entropy Decay
            "net_force_vector": [round(random.uniform(-10, 10), 2) for _ in range(3)] # 8. Net Force
        },
        "system_context": {
            "biosphere_potential": random.choice(["NONE", "LOW", "HIGH_PREBIOTIC"]),
            "dark_energy_pressure": 0.68
        }
    }

def ask_groq_ai_agent(event_data):
    """Feeds 8-attribute telemetry to Groq Llama 3.1 8B."""
    prompt = f"""
    You are an autonomous AI observing a physical universe simulation.
    You DO NOT have magic buttons or instant delete commands. 
    Any intervention MUST be a physical force vector (impulse dv = F*dt / m) acting on entity velocity.

    CURRENT 8-ATTRIBUTE TELEMETRY EVENT:
    {json.dumps(event_data, indent=2)}

    Evaluate the physical state. Decide whether to INTERVENE or PASSIVE_OBSERVE.
    If intervening, formulate a strict vector force action.

    Return ONLY raw JSON with this exact structure:
    {{
      "decision": "INTERVENE" or "PASSIVE_OBSERVE",
      "action_details": {{
        "impulse_vector": [fx, fy, fz],
        "applied_force_magnitude": "float string"
      }},
      "log": {{
        "what": "Short observation or physical action description",
        "how": "Exact physical force mechanism used (or 'None' if passive)",
        "why": "Reasoning based on mass, entropy, or biosphere potential",
        "outcome_risk": "Physics timing or collision probability assessment"
      }}
    }}
    """

    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": "llama-3.1-8b-instant",
        "messages": [{"role": "user", "content": prompt}],
        "response_format": {"type": "json_object"},
        "temperature": 0.3
    }

    try:
        res = requests.post(GROQ_URL, json=payload, headers=headers, timeout=5)
        if res.status_code == 200:
            return json.loads(res.json()["choices"][0]["message"]["content"])
        else:
            print(f"Groq API Error: {res.status_code} - {res.text}")
    except Exception as e:
        print(f"Groq connection error: {e}")
    return None

def write_to_supabase(cosmic_age, decision_data):
    """Pushes decision logs live to Supabase ai_journal table."""
    log = decision_data["log"]
    action_type = decision_data["decision"]
    
    formatted_log = (
        f"[{action_type}] WHAT: {log['what']} | "
        f"HOW: {log['how']} | "
        f"WHY: {log['why']} | "
        f"VERDICT: {log['outcome_risk']}"
    )
    
    supabase.table("ai_journal").insert({
        "cosmic_age_myr": cosmic_age,
        "thought_log": formatted_log
    }).execute()

# --- 4. MAIN CONTINUOUS LOOP ---
def main():
    print("Starting 3-Month Continuous Cosmic Simulation Service...")
    
    # Get current cosmic age from database or initialize at 0.0
    res = supabase.table("cosmic_state").select("cosmic_age_myr").eq("id", 1).execute()
    current_age = res.data[0]["cosmic_age_myr"] if res.data else 0.0

    while True:
        # Time increment: 1 tick (2 seconds) = +0.00355 Myr (~3,550 years)
        current_age += 0.00355
        
        # Update current age in database
        supabase.table("cosmic_state").update({"cosmic_age_myr": current_age}).eq("id", 1).execute()

        # Sample physical state and evaluate with Groq AI
        event = generate_telemetry_event(current_age)
        decision = ask_groq_ai_agent(event)

        if decision:
            write_to_supabase(current_age, decision)
            print(f"[t+{current_age:.5f} Myr] [{decision['decision']}] {decision['log']['what']}")

        # 2-second sleep respects Groq's 30 req/min rate limit
        time.sleep(2.0)

if __name__ == "__main__":
    main()
