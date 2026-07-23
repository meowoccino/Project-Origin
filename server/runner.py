import os
import time
import random
import requests
from supabase import create_client, Client

# --- ENVIRONMENT CONFIGURATION ---
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://nnntebgkhgzfztwfdphw.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ubnRlYmdraGd6Znp0d2ZkcGh3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDU3NTQ1NiwiZXhwIjoyMTAwMTUxNDU2fQ.YxpoNTujXCrJQcxZ9Bj8f_bFC6j_Fq6GLt74H8mEAq0")
CEREBRAS_API_KEY = os.getenv("CEREBRAS_API_KEY", "Csk-8j23hwwjff3ykh5n4v5nm5v42dknh9ywjf2j93ett2r5mww5")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# --- DYNAMIC ASTROPHYSICS GENERATOR ---
def generate_unique_physics(category_key: str):
    if category_key == "nebulae":
        temp = random.randint(10, 80)
        density = round(random.uniform(1.0, 9.9) * (10**random.randint(3, 5)), 1)
        mass = random.randint(100, 15000)
        label = "Nebula Cloud"
        specs = f"Gas Temp: {temp} K, Density: {density}/cm³, Mass: {mass} M_sun"

    elif category_key == "stars":
        star_type = random.choice(["Class-O Star", "Red Dwarf", "Blue Giant", "Yellow Dwarf"])
        if star_type == "Class-O Star":
            mass = round(random.uniform(15.0, 60.0), 1)
            temp = random.randint(30000, 50000)
            lum = random.randint(30000, 300000)
        elif star_type == "Red Dwarf":
            mass = round(random.uniform(0.08, 0.5), 2)
            temp = random.randint(2300, 3800)
            lum = round(random.uniform(0.0001, 0.05), 4)
        elif star_type == "Blue Giant":
            mass = round(random.uniform(10.0, 25.0), 1)
            temp = random.randint(10000, 28000)
            lum = random.randint(1000, 45000)
        else:
            mass = round(random.uniform(0.8, 1.15), 2)
            temp = random.randint(5300, 6000)
            lum = round(random.uniform(0.6, 1.5), 2)
        label = star_type
        specs = f"Mass: {mass} M_sun, Core Temp: {temp} K, Luminosity: {lum} L_sun"

    elif category_key == "black_holes":
        bh_type = random.choice(["Stellar-Mass Black Hole", "Intermediate Black Hole", "Supermassive Black Hole"])
        if bh_type == "Stellar-Mass Black Hole":
            mass = round(random.uniform(5.0, 85.0), 1)
            event_horizon = round(mass * 2.95, 1)
            spin = round(random.uniform(0.12, 0.98), 2)
            specs = f"Mass: {mass} M_sun, Event Horizon: {event_horizon} km, Spin: {spin} Kerr"
        elif bh_type == "Intermediate Black Hole":
            mass = random.randint(100, 10000)
            event_horizon = round(mass * 2.95, 1)
            spin = round(random.uniform(0.40, 0.99), 2)
            specs = f"Mass: {mass} M_sun, Event Horizon: {event_horizon} km, Spin: {spin} Kerr"
        else:
            mass = round(random.uniform(0.1, 8.5), 2)
            event_horizon = round(mass * 0.02, 3)
            spin = round(random.uniform(0.85, 0.99), 2)
            specs = f"Mass: {mass}M M_sun, Event Horizon: {event_horizon} AU, Spin: {spin} Kerr"
        label = bh_type

    elif category_key == "neutron_stars":
        b_field = random.randint(11, 15)
        spin_period = round(random.uniform(1.2, 85.0), 1)
        radius = round(random.uniform(10.2, 13.5), 1)
        label = random.choice(["Pulsar Burst", "Magnetar Core", "Neutron Core"])
        specs = f"B-Field: 10^{b_field} Gauss, Spin Period: {spin_period} ms, Radius: {radius} km"

    elif category_key == "planets":
        p_type = random.choice(["Terrestrial Planet", "Gas Giant", "Ice Giant", "Lava World"])
        if p_type == "Terrestrial Planet":
            gravity = round(random.uniform(0.4, 2.2), 2)
            pressure = round(random.uniform(0.01, 8.5), 2)
            orbit = round(random.uniform(0.3, 2.5), 2)
            specs = f"Surface Gravity: {gravity} g, Pressure: {pressure} bar, Orbit: {orbit} AU"
        elif p_type == "Gas Giant":
            radius = random.randint(45000, 120000)
            orbit = round(random.uniform(3.5, 18.0), 1)
            specs = f"Radius: {radius} km, Orbit: {orbit} AU, Atmosphere: H2/He rich"
        else:
            temp = random.randint(80, 1800)
            orbit = round(random.uniform(0.1, 40.0), 1)
            specs = f"Surface Temp: {temp} K, Orbit: {orbit} AU"
        label = p_type

    elif category_key == "moons":
        radius = random.randint(300, 2800)
        orbit = random.randint(150000, 2000000)
        composition = random.choice(["Silicate Ice", "Iron-Rock", "Methane Crust"])
        label = "Major Satellite"
        specs = f"Radius: {radius} km, Orbital Distance: {orbit} km, Core: {composition}"

    elif category_key == "quasars":
        redshift = round(random.uniform(0.8, 6.5), 2)
        lum = round(random.uniform(1.0, 9.9) * (10**12), 1)
        label = "Active Quasar"
        specs = f"Redshift z: {redshift}, Luminosity: {lum} L_sun, Relativistic Jet Detected"

    elif category_key == "asteroids":
        count = random.randint(50, 5000)
        mass = round(random.uniform(0.01, 12.0), 2)
        label = "Asteroid Belt / Comet Cluster"
        specs = f"Estimated Fragment Count: {count}, Total Mass: {mass} x 10^18 kg"

    else:
        label = random.choice(["Dyson Swarm Candidate", "Quark Star", "Dark Matter Core"])
        temp = random.randint(0, 1000)
        energy = round(random.uniform(1.0, 99.0), 1)
        specs = f"Thermal Emission: {temp} K, Energy Flux: {energy} TeraWatts"

    return category_key, label, specs

# --- AI NAMING ENGINE ---
def generate_ai_object_name(category: str, physics_data: str = "") -> str:
    prompt = (
        f"You are naming a newly born celestial object in a cosmic simulation.\n"
        f"Category: {category}\n"
        f"Physical Properties: {physics_data}\n\n"
        f"Task: Generate ONE unique, scientifically evocative name for this object.\n"
        f"Rules: Output ONLY the name text. Do NOT use quotation marks, explanations, or punctuation."
    )

    if CEREBRAS_API_KEY:
        try:
            url = "https://api.cerebras.ai/v1/chat/completions"
            headers = {
                "Authorization": f"Bearer {CEREBRAS_API_KEY}",
                "Content-Type": "application/json"
            }
            payload = {
                "model": "llama-3.3-70b",
                "messages": [
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.85,
                "max_tokens": 20
            }
            res = requests.post(url, json=payload, headers=headers, timeout=5)
            if res.status_code == 200:
                data = res.json()
                text = data["choices"][0]["message"]["content"].strip(' "\'\n')
                if text:
                    return text
            else:
                print(f"⚠️ [CEREBRAS NAMER ERROR]: Status {res.status_code}")
        except Exception as err:
            print(f"⚠️ [CEREBRAS NAMER EXCEPTION]: {err}")

    return f"{category.replace('_', ' ').title()} #{random.randint(1000, 9999)}"

# --- SIMULATION MAIN LOOP ---
def run_simulation_step():
    try:
        supabase.table("universe_state").delete().neq("id", 1).execute()

        res = supabase.table("universe_state").select("*").eq("id", 1).execute()
        current_age = float(res.data[0].get("age", 0.001)) if (res.data and len(res.data) > 0) else 0.001
        new_age = round(current_age + 0.005, 3)

        supabase.table("universe_state").upsert({
            "id": 1, "age": new_age, "de_pct": 68.5, "dm_pct": 26.4, "baryon_pct": 5.1
        }).execute()

        cat_res = supabase.table("catalog_stats").select("*").eq("id", 1).execute()
        stats = cat_res.data[0] if (cat_res.data and len(cat_res.data) > 0) else {}
        
        c_nebulae = stats.get("nebulae", 0)
        c_stars = stats.get("stars", 0)

        possible_spawns = ["nebulae"]

        if c_nebulae >= 3:
            possible_spawns.extend(["stars", "asteroids"])
        if c_stars >= 10:
            possible_spawns.extend(["planets", "moons"])
        if c_stars >= 25:
            possible_spawns.extend(["neutron_stars", "black_holes"])
        if c_stars >= 50:
            possible_spawns.extend(["quasars", "exotic_objects"])

        chosen_category = random.choice(possible_spawns)
        cat_key, cat_label, physics_specs = generate_unique_physics(chosen_category)

        ai_name = generate_ai_object_name(cat_key, physics_specs)
        event_title = f"{ai_name} ({cat_label})"
        event_desc = f"Evolutionary shift detected at Age {new_age} Gyr. Specs: {physics_specs}."

        supabase.table("events").insert({
            "title": event_title, 
            "description": event_desc, 
            "age": new_age,
            "category": cat_key
        }).execute()

        current_val = stats.get(cat_key, 0)
        if stats:
            supabase.table("catalog_stats").update({cat_key: current_val + 1}).eq("id", stats["id"]).execute()

        print(f"✅ [EVOLUTION]: Age {new_age} Gyr | Spawned: '{event_title}'")

    except Exception as e:
        print(f"❌ [SIMULATION ERROR]: {e}")

if __name__ == "__main__":
    print("🚀 [PROJECT ORIGIN] Evolutionary Engine Active...")
    while True:
        run_simulation_step()
        time.sleep(10)
