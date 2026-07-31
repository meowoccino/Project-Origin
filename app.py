import os
import sys
import subprocess
from http.server import BaseHTTPRequestHandler, HTTPServer

print("🚀 [MASTER] Booting Origin Dual-Engine System...", flush=True)
subprocess.Popen([sys.executable, "-u", "server/runner.py"])
subprocess.Popen([sys.executable, "-u", "server/brain.py"])

class HealthCheckHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header("Content-type", "text/plain")
        self.end_headers()
        self.wfile.write(b"Project Origin is Online.")

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 10000))
    print(f"🌐 [WEB] Binding to port {port} to keep Render active...", flush=True)
    server = HTTPServer(("0.0.0.0", port), HealthCheckHandler)
    server.serve_forever()
