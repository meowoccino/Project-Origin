import time, math, random, requests

SUPABASE_URL = "https://nnntebgkhgzfztwfdphw.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ubnRlYmdraGd6Znp0d2ZkcGh3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDU3NTQ1NiwiZXhwIjoyMTAwMTUxNDU2fQ.YxpoNTujXCrJQcxZ9Bj8f_bFC6j_Fq6GLt74H8mEAq0"
HEADERS = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}", "Content-Type": "application/json", "Prefer": "return=minimal"}

def calculate_cosmology(age):
    m = 0.315 / (1.0 + (age * 0.25)**3)
    l = 1.0 - m
    return round(l * 100, 1), round(m * 84, 1), round(100 - (l * 100) - (m * 84), 1)

def calculate_sagan_kardashev(w):
    return round(max(0.0, (math.log10(w) - 6.0) / 10.0), 3) if w > 0 else 0.0

def seed_celestial_object(age):
    t = random.uniform(-200, 400)
    has_life, bio = False, None
    if 0 <= t <= 50 and random.random() < 0.1: has_life, bio = True, "Carbon/Water"
    elif t < -100 and random.random() < 0.6: has_life, bio = True, "Carbon/Methane"
    elif t > 100 and random.random() < 0.3: has_life, bio = True, "Carbon/Sulfur"
    p_age = random.uniform(0.1, max(0.1, age / 2.0)) if age > 0.2 else 0
    prog = round(min((p_age / 4.0) ** 0.5, 2.5), 3) if has_life and p_age >= 0.1 else 0.0
    w = 10 ** random.uniform(10, 26) if prog > 0.8 else 0
    return {"name": f"Exoplanet {random.randint(1000, 9999)}-{random.choice('abcdef')}", "object_type": "Planet", "surface_temp": round(t, 1), "has_life": has_life, "biochemistry_class": bio, "progress_index": prog, "kardashev_scale": calculate_sagan_kardashev(w)}

def run():
    print("[PROJECT ORIGIN] Physics Engine Initialized...")
    age, tick = 0.0, 0
    while True:
        tick += 1
        age += 0.001
        sprint = age < 0.1
        de, dm, b = calculate_cosmology(age)
        try:
            requests.post(f"{SUPABASE_URL}/rest/v1/universe_state", headers=HEADERS, json={"age": age, "de_pct": de, "dm_pct": dm, "baryon_pct": b}, timeout=5)
            if age >= 0.1 and random.random() < 0.2:
                requests.post(f"{SUPABASE_URL}/rest/v1/celestial_objects", headers=HEADERS, json=seed_celestial_object(age), timeout=5)
            print(f"[{'SPRINT' if sprint else 'CRUISE'} | Tick {tick}] Age: {age:.4f} Gyr")
        except Exception as e:
            print(f"[Tick {tick}] Network error: {e}")
        time.sleep(2 if sprint else 60)

if __name__ == "__main__":
    run()
