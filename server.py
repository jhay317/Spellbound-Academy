import http.server
import socketserver
import webbrowser
import os
import json
from datetime import datetime

"""
Spellbound Academy Game Server

A simple HTTP server handling API requests for the spelling game.
It manages score saving/retrieval and user progress tracking via JSON files.
"""

PORT = 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))
SCORES_FILE = os.path.join(DIRECTORY, "scores.json")
USER_PROGRESS_FILE = os.path.join(DIRECTORY, "user_progress.json")

class Handler(http.server.SimpleHTTPRequestHandler):
    """
    Custom HTTP Request Handler for the Spelling Game API.
    
    Handles:
    - GET /api/scores: Retrieve leaderboard scores
    - GET /api/user_progress: Retrieve persistent progress for a user
    - POST /api/score: Save a new score
    - POST /api/update_word_stats: Update mastery stats for specific words
    - Static file serving for the game assets
    """

    def do_GET(self):
        """Handle GET requests for static files and API endpoints."""

        if self.path == '/api/scores':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            
            if os.path.exists(SCORES_FILE):
                with open(SCORES_FILE, 'r') as f:
                    self.wfile.write(f.read().encode())
            else:
                self.wfile.write(b'[]')
        elif self.path.startswith('/api/user_progress'):
            # Parse query parameters manually since we're using SimpleHTTPRequestHandler
            query = self.path.split('?')
            name = None
            if len(query) > 1:
                params = query[1].split('&')
                for p in params:
                    if p.startswith('name='):
                        name = p.split('=')[1]
                        import urllib.parse
                        name = urllib.parse.unquote(name)
                        break
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            
            progress = {}
            if os.path.exists(USER_PROGRESS_FILE):
                with open(USER_PROGRESS_FILE, 'r') as f:
                    try:
                        all_progress = json.load(f)
                        if name and name in all_progress:
                            progress = all_progress[name]
                    except json.JSONDecodeError:
                        pass
            
            self.wfile.write(json.dumps(progress).encode())

        else:
            return http.server.SimpleHTTPRequestHandler.do_GET(self)

    def do_POST(self):
        """Handle POST requests for saving scores and updating user stats."""

        if self.path == '/api/score':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            try:
                new_score = json.loads(post_data.decode('utf-8'))
                
                scores = []
                if os.path.exists(SCORES_FILE):
                    with open(SCORES_FILE, 'r') as f:
                        try:
                            scores = json.load(f)
                        except json.JSONDecodeError:
                            scores = []
                
                # Add timestamp
                new_score['date'] = datetime.now().strftime("%Y-%m-%d %H:%M")
                scores.append(new_score)
                
                # Sort by score (descending) and keep top 10
                scores.sort(key=lambda x: x['score'], reverse=True)
                scores = scores[:10]
                
                with open(SCORES_FILE, 'w') as f:
                    json.dump(scores, f)
                
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "success", "scores": scores}).encode())
                
            except Exception as e:
                self.send_response(500)
                self.wfile.write(str(e).encode())

        elif self.path == '/api/update_word_stats':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            try:
                data = json.loads(post_data.decode('utf-8'))
                user = data.get('name')
                word = data.get('word')
                correct = data.get('correct')
                
                if not user or not word:
                    raise ValueError("Missing name or word")

                all_progress = {}
                if os.path.exists(USER_PROGRESS_FILE):
                    with open(USER_PROGRESS_FILE, 'r') as f:
                        try:
                            all_progress = json.load(f)
                        except json.JSONDecodeError:
                            all_progress = {}
                
                if user not in all_progress:
                    all_progress[user] = {}
                
                if word not in all_progress[user]:
                    all_progress[user][word] = {"correct": 0, "incorrect": 0, "last_seen": 0}
                
                stats = all_progress[user][word]
                if correct:
                    stats["correct"] += 1
                else:
                    stats["incorrect"] += 1
                
                stats["last_seen"] = datetime.now().timestamp()
                
                with open(USER_PROGRESS_FILE, 'w') as f:
                    json.dump(all_progress, f)
                
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "success"}).encode())

            except Exception as e:
                self.send_response(500)
                self.wfile.write(str(e).encode())
        else:
            self.send_error(404)

def run_server():
    """
    Start the HTTP server on localhost:8000.
    
    Change working directory to the script's location, opens the default
    web browser, and serves forever until interrupted.
    """

    os.chdir(DIRECTORY)
    socketserver.TCPServer.allow_reuse_address = True
    
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"Server started at http://localhost:{PORT}")
        print("Opening browser...")
        webbrowser.open(f"http://localhost:{PORT}")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")
            httpd.shutdown()

if __name__ == "__main__":
    run_server()
