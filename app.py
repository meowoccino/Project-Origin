import subprocess
import sys
from flask import Flask
from threading import Thread

app = Flask(__name__)

@app.route('/')
def home():
    return "Project Origin is online and expanding."

def launch_engines():
    # Stream logs so background output appears directly in Render
    subprocess.Popen(["python", "-u", "runner.py"], stdout=sys.stdout, stderr=sys.stderr)
    subprocess.Popen(["python", "-u", "brain.py"], stdout=sys.stdout, stderr=sys.stderr)

if __name__ == '__main__':
    Thread(target=launch_engines).start()
    app.run(host='0.0.0.0', port=10000)
