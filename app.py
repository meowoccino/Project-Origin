import os
import sys
import subprocess
from http.server import BaseHTTPRequestHandler, HTTPServer

# 1. Boot both of your actual engines in the background
print("🚀 [MASTER] Booting Origin Dual-Engine System...", flush=True)
subprocess.Popen([sys.executable, "-u", "server/runner.py"])
subprocess.Popen([sys.executable, "-u", "server/brain.py"])

# 2. Create a tiny web server just to pass Render's health checks
class HealthCheckHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header("Content-type", "text/plain")
        self.end_headers()
        self.wfile.write(b"Project Origin is Online.")

# 3. Bind to the exact port Render assigns so they don't kill the service
if __name__ == '__main__':
    port = int(os.environ.get("PORT", 10000))
    print(f"🌐 [WEB] Binding to port {port} to keep Render active...", flush=True)
    server = HTTPServer(("0.0.0.0", port), HealthCheckHandler)
    server.serve_forever()
