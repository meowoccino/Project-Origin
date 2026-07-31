import sys
import time
import subprocess

def start_engines():
    print("🚀 [MASTER] Booting Origin Dual-Engine System...", flush=True)
    
    # Launch both scripts in the background using the correct system Python
    runner_process = subprocess.Popen([sys.executable, "-u", "server/runner.py"])
    brain_process = subprocess.Popen([sys.executable, "-u", "server/brain.py"])
    
    # Keep the master script alive forever so Render doesn't shut it down
    while True:
        time.sleep(60)

if __name__ == '__main__':
    start_engines()
