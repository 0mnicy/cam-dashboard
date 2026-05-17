#!/usr/bin/env python3
"""
Camera Dashboard — Simple HTTP Server

Usage:
    python3 server.py                  # Run on port 8888
    python3 server.py --port 8080      # Custom port
    python3 server.py --port 80 --user www-data  # Run as www-data (needs sudo)
"""

import argparse
import os
import sys
from http.server import HTTPServer, SimpleHTTPRequestHandler
import socketserver

# Fix: handle encoding errors gracefully
class CustomHandler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        # Remove query string and fragment
        path = path.split('?')[0].split('#')[0]
        return super().translate_path(path)

def main():
    parser = argparse.ArgumentParser(description='Camera Dashboard HTTP Server')
    parser.add_argument('--port', type=int, default=8888, help='Port to listen on')
    args = parser.parse_args()

    # Set directory to script location (where cameras.json lives)
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)

    handler = CustomHandler
    handler.directory = script_dir

    try:
        server = HTTPServer(('0.0.0.0', args.port), handler)
        print(f"Camera Dashboard running on http://0.0.0.0:{args.port}/")
        print(f"Serving files from: {script_dir}")
        print("Press Ctrl+C to stop")
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server...")
        server.server_close()
    except OSError as e:
        print(f"Error: {e}")
        print("\nIf port is in use, try: python3 server.py --port 8889")
        sys.exit(1)

if __name__ == '__main__':
    main()
