import subprocess
from flask import Flask
from threading import Thread

app = Flask(__name__)

@app.route('/')
def home():
    return "Project Origin is online and expanding."

def launch_engines():
    subprocess.Popen(["python", "-u", "runner.py"])
    subprocess.Popen(["python", "-u", "brain.py"])

if __name__ == '__main__':
    Thread(target=launch_engines).start()
    app.run(host='0.0.0.0', port=10000)
