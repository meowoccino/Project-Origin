import os
import sys
import subprocess
from flask import Flask

app = Flask(__name__)

# This explicitly tells Render's Linux system how to run your background scripts
subprocess.Popen([sys.executable, "-u", "server/runner.py"])
subprocess.Popen([sys.executable, "-u", "server/brain.py"])

@app.route('/')
def health_check():
    return "Project Origin Backend is Online and Running.", 200

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
