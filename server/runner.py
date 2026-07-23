import os
import time
import requests
from supabase import create_client, Client

SUPABASE_URL = os.getenv("SUPABASE_URL", "your_supabase_url")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "your_supabase_key")
SAMBANOVA_API_KEY = os.getenv("SAMBANOVA_API_KEY", "your_sambanova_key")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def generate_ai_object_name(category: str, physics_data: str = ""):
    prompt = (
        f"Generate ONE unique short futuristic name for a celestial {category}. "
        f"Properties: {physics_data}. Output ONLY the name, no quotes or explanation."
    )
    
    url = "https://api.sambanova.ai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {SAMBANOVA_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": "Meta-Llama-3.1-8B-Instruct",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.85,
        "max_tokens": 20
    }

    try:
        res = requests.post(url, json=payload, headers=headers, timeout=10)
        if res.status_code == 200:
            return res.json()["choices"][0]["message"]["content"].strip(' "\'\n')
        else:
            print(f"🛑 [API REJECTED]: Status {res.status_code} - Simulation step aborted.")
            return None
    except Exception as err:
        print(f"🛑 [NETWORK FATAL]: {err} - Simulation step aborted.")
        return None

def run_simulation_step():
    # ... (Your existing unique physics generation code goes here) ...
    # cat_key, cat_label, physics_specs = generate_unique_physics(chosen_category)

    # STRICT RULE: Fetch AI Name. If it fails, ABORT EVERYTHING.
    ai_name = generate_ai_object_name(cat_key, physics_specs)
    
    if not ai_name:
        print("❌ [SIMULATION HALTED]: AI Failed to provide real data. Skipping injection.")
        return # Stops the function completely. No fake data allowed.

    # If successful, inject into Supabase
    event_title = f"{ai_name} ({cat_label})"
    event_desc = f"Evolutionary shift detected at Age {new_age} Gyr. Specs: {physics_specs}."
    
    supabase.table("events").insert({
        "title": event_title, 
        "description": event_desc, 
        "age": new_age,
        "category": cat_key
    }).execute()

    print(f"✅ [EVOLUTION]: Age {new_age} Gyr | Spawned: '{event_title}'")

if __name__ == "__main__":
    print("🚀 [PROJECT ORIGIN] Strict Evolutionary Engine Active...")
    while True:
        run_simulation_step()
        # Slowed down from 10s to 30s to keep API limits safe
        time.sleep(30) 
