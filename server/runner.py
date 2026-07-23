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

# --- AI NAMING ENGINE (LLAMA 3 VIA OPENROUTER) ---
def generate_ai_object_name(category: str, physics_data: str = "") -> str:
    if not OPENROUTER_API_KEY:
        fallback_num = random.randint(100, 999)
        return f"{category.replace('_', ' ').title()} #{fallback_num}"

    prompt = (
        f"You are naming a newly born celestial object in a cosmic simulation.\n"
        f"Category: {category}\n"
        f"Physical Properties: {physics_data}\n\n"
        f"Task: Generate ONE unique, scientifically evocative, astronomical, or atmospheric name for this object "
        f"(e.g. 'The Veil of Caelum', 'Aurelia-9', 'The Blind Singularity', 'Helios-X', 'Chrono-Disk').\n"
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
                "model": "meta-llama/llama-3-70b-instruct",
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.85,
                "max_tokens": 15
            },
            timeout=4
        )
        if response.status_code == 200:
            ai_name = response.json()['choices'][0]['message']['content'].strip(' "\'\n')
            if ai_name:
                return ai_name
    except Exception as err:
        print(f"⚠️ [AI NAMER TIMEOUT/ERROR]: {err} — Using procedural fallback.")

    fallback_num = random.randint(100, 999)
    return f"{category.replace('_', ' ').title()} #{fallback_num}"


# --- SIMULATION MAIN LOOP ---
def run_simulation_step():
    try:
        res = supabase.table("universe_state").select("*").order("id", desc=True).limit(1).execute()
        current_age = 0.001
        de_pct, dm_pct, baryon_pct = 68.5, 26.4, 5.1

        if res.data and len(res.data) > 0:
            current_age = float(res.data[0].get("age", 0.001))
            de_pct = float(res.data[0].get("de_pct", 68.5))
            dm_pct = float(res.data[0].get("dm_pct", 26.4))
            baryon_pct = float(res.data[0].get("baryon_pct", 5.1))

        new_age = round(current_age + 0.005, 3)

        supabase.table("universe_state").upsert({
            "id": 1,
            "age": new_age,
            "de_pct": de_pct,
            "dm_pct": dm_pct,
            "baryon_pct": baryon_pct
        }).execute()

        categories = [
            ("nebulae", "Nebula Cloud", "Gas Temp: 18 K, Density: 10^4/cm³, H2/He Composition"),
            ("stars", "Class-O Star", "Mass: 18.5 M_sun, Core Temp: 33,000 K, Luminosity: 45,000 L_sun"),
            ("black_holes", "Supermassive Black Hole", "Mass: 4.2M M_sun, Schwarzschild Radius: 0.08 AU"),
            ("neutron_stars", "Pulsar Burst", "B-Field: 10^14 Gauss, Spin Period: 5.8 ms, Radius: 11.2 km"),
            ("planets", "Terrestrial Planet", "Surface Gravity: 1.12 g, Pressure: 1.18 bar")
        ]

        category_key, category_label, physics_specs = random.choice(categories)

        ai_name = generate_ai_object_name(category_key, physics_specs)

        event_title = f"{ai_name} ({category_label})"
        event_desc = f"Thermodynamic equilibrium shift detected at Age {new_age} Gyr. Physical specs: {physics_specs}."

        supabase.table("events").insert({
            "title": event_title,
            "description": event_desc,
            "age": new_age
        }).execute()

        cat_res = supabase.table("catalog_stats").select("*").limit(1).execute()
        if cat_res.data and len(cat_res.data) > 0:
            stats = cat_res.data[0]
            current_val = stats.get(category_key, 0) or 0
            supabase.table("catalog_stats").update({category_key: current_val + 1}).eq("id", stats["id"]).execute()

        print(f"✅ [SIMULATION ADVANCED]: Age {new_age} Gyr | Spawned: '{event_title}'")

    except Exception as e:
        print(f"❌ [SIMULATION ERROR]: {e}")


if __name__ == "__main__":
    print("🚀 [PROJECT ORIGIN] Physics Engine Started. Running 24/7...")
    while True:
        run_simulation_step()
        time.sleep(10)
