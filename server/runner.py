import os
import time
import random
import requests
from supabase import create_client, Client

# --- ENVIRONMENT CONFIGURATION ---
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://nnntebgkhgzfztwfdphw.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ubnRlYmdraGd6Znp0d2ZkcGh3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDU3NTQ1NiwiZXhwIjoyMTAwMTUxNDU2fQ.YxpoNTujXCrJQcxZ9Bj8f_bFC6j_Fq6GLt74H8mEAq0")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# --- AI NAMING ENGINE ---
def generate_ai_object_name(category: str, physics_data: str = "") -> str:
    if not OPENROUTER_API_KEY:
        fallback_num = random.randint(1000, 9999)
        return f"{category.replace('_', ' ').title()} #{fallback_num}"

    prompt = (
        f"You are naming a newly born celestial object in a cosmic simulation.\n"
        f"Category: {category}\n"
        f"Physical Properties: {physics_data}\n\n"
        f"Task: Generate ONE unique, scientifically evocative name for this object "
        f"(e.g. 'The Veil of Caelum', 'Aurelia-9', 'The Blind Singularity').\n"
        f"Rules: Output ONLY the name text. Do NOT use quotation marks, explanations, or punctuation."
    )

    try:
        response = requests.post(
            url="https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": "meta-llama/llama-3.3-70b-instruct:free",
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.85,
                "max_tokens": 15
            },
            timeout=5
        )
        if response.status_code == 200:
            ai_name = response.json()['choices'][0]['message']['content'].strip(' "\'\n')
            if ai_name:
                return ai_name
        else:
            print(f"⚠️ API Key active but rejected: Status {response.status_code} - {response.text}")
    except Exception as err:
        print(f"⚠️ [AI NAMER TIMEOUT/ERROR]: {err}")

    fallback_num = random.randint(1000, 9999)
    return f"{category.replace('_', ' ').title()} #{fallback_num}"

# --- SIMULATION MAIN LOOP ---
def run_simulation_step():
    try:
        # 1. Advance Age (FIXED BUG: Always target ID 1 to prevent time loops)
        res = supabase.table("universe_state").select("*").eq("id", 1).execute()
        current_age = float(res.data[0].get("age", 0.001)) if (res.data and len(res.data) > 0) else 0.001
        new_age = round(current_age + 0.005, 3)

        supabase.table("universe_state").upsert({
            "id": 1, "age": new_age, "de_pct": 68.5, "dm_pct": 26.4, "baryon_pct": 5.1
        }).execute()

        # 2. Fetch Catalog to dictate Evolutionary Phase
        cat_res = supabase.table("catalog_stats").select("*").eq("id", 1).execute()
        stats = cat_res.data[0] if (cat_res.data and len(cat_res.data) > 0) else {}
        
        c_nebulae = stats.get("nebulae", 0)
        c_stars = stats.get("stars", 0)

        # Base Phase 1: Nebulae always allowed
        possible_spawns = [
            ("nebulae", "Nebula Cloud", "Gas Temp: 18 K, Density: 10^4/cm³, H2/He Composition")
        ]

        # Phase 2: Stars ignite if enough Nebulae exist
        if c_nebulae >= 5:
            possible_spawns.append(("stars", "Class-O Star", "Mass: 18.5 M_sun, Core Temp: 33,000 K, Luminosity: 45,000 L_sun"))
            possible_spawns.append(("stars", "Red Dwarf", "Mass: 0.3 M_sun, Core Temp: 4,000 K, Luminosity: 0.01 L_sun"))
            possible_spawns.append(("stars", "Blue Giant", "Mass: 25.0 M_sun, Core Temp: 40,000 K, Luminosity: 80,000 L_sun"))

        # Phase 3: Planets accrete if enough Stars exist
        if c_stars >= 15:
            possible_spawns.append(("planets", "Terrestrial Planet", "Surface Gravity: 1.12 g, Pressure: 1.18 bar, Orbit: 1.02 AU"))
            possible_spawns.append(("planets", "Gas Giant", "Radius: 71,492 km, Core: Silicate Rock, Atmosphere: H/He"))

        # Phase 4: Stellar Death triggers if star population is very high
        if c_stars >= 40:
            possible_spawns.append(("neutron_stars", "Pulsar Burst", "B-Field: 10^14 Gauss, Spin Period: 5.8 ms, Radius: 11.2 km"))
            possible_spawns.append(("black_holes", "Stellar-Mass Black Hole", "Mass: 14 M_sun, Event Horizon: 41.3 km"))

        category_key, category_label, physics_specs = random.choice(possible_spawns)

        # 3. Spawn Object
        ai_name = generate_ai_object_name(category_key, physics_specs)
        event_title = f"{ai_name} ({category_label})"
        event_desc = f"Evolutionary shift detected at Age {new_age} Gyr. Specs: {physics_specs}."

        supabase.table("events").insert({"title": event_title, "description": event_desc, "age": new_age}).execute()

        # 4. Update Inventory
        current_val = stats.get(category_key, 0)
        if stats:
            supabase.table("catalog_stats").update({category_key: current_val + 1}).eq("id", stats["id"]).execute()

        print(f"✅ [EVOLUTION]: Age {new_age} Gyr | Spawned: '{event_title}'")

    except Exception as e:
        print(f"❌ [SIMULATION ERROR]: {e}")

if __name__ == "__main__":
    print("🚀 [PROJECT ORIGIN] Evolutionary Engine Started. Running 24/7...")
    while True:
        run_simulation_step()
        time.sleep(10)
