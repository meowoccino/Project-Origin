
import time
import requests
import json
from supabase import create_client, Client

# --- SUPABASE SETUP (AUTO-FILLED CREDENTIALS) ---
SUPABASE_URL = "https://nnntebgkhgzfztwfdphw.supabase.co"
SUPABASE_KEY = "sb_publishable_O5qr-6UD-6wTzi51j3tYtw_00N9Q4ja"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# --- OLLAMA LOCAL AI SETUP ---
OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL_NAME = "llama3.2:3b"

def get_current_cosmic_age():
    response = supabase.table("cosmic_state").select("cosmic_age_myr").eq("id", 1).execute()
    if response.data:
        return response.data[0]["cosmic_age_myr"]
    return 0.0

def update_cosmic_age(new_age):
    supabase.table("cosmic_state").update({"cosmic_age_myr": new_age}).eq("id", 1).execute()

def ask_ai_observer(cosmic_age):
    prompt = f"You are a cosmic AI observer watching a physical universe simulation. The current age is t = {cosmic_age:.1f} Million Years. Write a short, realistic 2-sentence astronomical log entry detailing galactic structure formation or cosmic filament observation."
    
    payload = {
        "model": MODEL_NAME,
        "prompt": prompt,
        "stream": False
    }
    
    try:
        res = requests.post(OLLAMA_URL, json=payload, timeout=30)
        if res.status_code == 200:
            return res.json().get("response", "").strip()
    except Exception as e:
        print(f"Ollama connection error: {e}")
    return None

def write_ai_thought(cosmic_age, thought):
    supabase.table("ai_journal").insert({
        "cosmic_age_myr": cosmic_age,
        "thought_log": thought
    }).execute()

# --- MAIN 24/7 LOOP ---
def main():
    print("Starting 24/7 Cosmic Runner Service...")
    current_age = get_current_cosmic_age()
    
    tick_counter = 0

    while True:
        # 1. Advance cosmic age by 0.1 Myr every second
        current_age += 0.1
        update_cosmic_age(current_age)
        
        tick_counter += 1

        # 2. Every 60 seconds (6 Myr), trigger the local AI observer
        if tick_counter >= 60:
            tick_counter = 0
            thought = ask_ai_observer(current_age)
            if thought:
                write_ai_thought(current_age, thought)
                print(f"[t+{current_age:.1f} Myr] AI Logged: {thought}")

        time.sleep(1) # 1-second pulse tick

if __name__ == "__main__":
    main()
