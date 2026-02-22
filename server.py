import http.server
import socketserver
import webbrowser
import threading
import os
import json
import asyncio
import edge_tts
import urllib.parse
from datetime import datetime

"""
Spellbound Academy Game Server

A simple HTTP server handling API requests for the spelling game.
It manages score saving/retrieval and user progress tracking via JSON files.
"""

PORT = int(os.environ.get("PORT", 8000))
DIRECTORY = os.path.dirname(os.path.abspath(__file__))
SCORES_FILE = os.path.join(DIRECTORY, "scores.json")
USER_PROGRESS_FILE = os.path.join(DIRECTORY, "user_progress.json")
SOUNDS_DIR = os.path.join(DIRECTORY, "sounds")

if not os.path.exists(SOUNDS_DIR):
    os.makedirs(SOUNDS_DIR)

def robust_generate_tts(word, filepath, rate, voice="en-US-AriaNeural", retries=3):
    """
    Generate TTS audio with multiple retry attempts and exponential backoff.
    Returns (success, error_message).
    """
    tmp_filepath = filepath + ".tmp"

    async def _internal_generate():
        last_error = None
        for attempt in range(retries):
            try:
                communicate = edge_tts.Communicate(word, voice, rate=rate)
                await communicate.save(tmp_filepath)
                
                # Verify file integrity
                if os.path.exists(tmp_filepath) and os.path.getsize(tmp_filepath) > 0:
                    os.replace(tmp_filepath, filepath)
                    return True, None
                
                last_error = "Generated file is missing or empty."
            except Exception as e:
                last_error = str(e)
            
            if attempt < retries - 1:
                wait_time = (2 ** attempt)
                # print(f"[RETRY] '{word}' attempt {attempt+1} failed: {last_error}. Retrying in {wait_time}s...")
                await asyncio.run_coroutine_threadsafe(asyncio.sleep(wait_time), asyncio.get_event_loop()) if False else await asyncio.sleep(wait_time)
        
        if os.path.exists(tmp_filepath):
            try:
                os.remove(tmp_filepath)
            except Exception:
                pass
        return False, last_error

    try:
        # Since we're in a threaded environment, each call gets its own event loop via asyncio.run
        return asyncio.run(_internal_generate())
    except Exception as e:
        return False, str(e)

class Handler(http.server.SimpleHTTPRequestHandler):
    """
    Custom HTTP Request Handler for the Spelling Game API.
    
    Handles:
    - GET /api/scores: Retrieve leaderboard scores
    - GET /api/user_progress: Retrieve persistent progress for a user
    - POST /api/score: Save a new score
    - POST /api/update_word_stats: Update mastery stats for specific words
    - POST /api/precache_words: Generate audio for a list of words in the background
    - Static file serving for the game assets
    """

    def log_message(self, format, *args):
        """Custom logger to provide more visibility in the console."""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {self.address_string()} - {format % args}")

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

        elif self.path.startswith('/api/speak'):
            # Parse query parameters
            query = self.path.split('?')
            word = ""
            rate = "+0%"  # Default rate for edge-tts
            
            if len(query) > 1:
                params = query[1].split('&')
                for p in params:
                    if p.startswith('word='):
                        word = urllib.parse.unquote(p.split('=')[1]).lower().strip()
                    elif p.startswith('rate='):
                        rate = urllib.parse.unquote(p.split('=')[1])
            
            if not word:
                print(f"[ERROR] /api/speak: Missing word parameter in request: {self.path}")
                self.send_error(400, "Missing word parameter")
                return

            # Sanitize filename
            safe_word = "".join([c for c in word if c.isalnum() or c in (' ', '-', '_')]).strip()
            safe_rate = rate.replace('+', 'p').replace('-', 'm').replace('%', '')
            filename = f"{safe_word}_{safe_rate}.mp3"
            filepath = os.path.join(SOUNDS_DIR, filename)

            # File validation: Check if exists AND is not empty
            file_exists = os.path.exists(filepath)
            file_is_empty = file_exists and os.path.getsize(filepath) == 0

            if not file_exists or file_is_empty:
                if file_is_empty:
                    print(f"[REGEN] Empty file detected: '{filename}'. Deleting and regenerating...")
                    try:
                        os.remove(filepath)
                    except Exception as e:
                        print(f"[ERROR] Failed to delete empty file {filepath}: {e}")

                # Generate audio
                print(f"[TTS] Generating neural audio for: '{word}' (Rate: {rate})")
                success, error = robust_generate_tts(word, filepath, rate)
                
                if not success:
                    print(f"[ERROR] TTS Generation Failed for '{word}': {error}")
                    self.send_error(500, f"TTS Generation Failed: {error}")
                    return
                
                print(f"[SUCCESS] Generated: {filename} ({os.path.getsize(filepath)} bytes)")
            else:
                # Verbose logging for cached hits
                # print(f"[CACHE] Serving: {filename}")
                pass

            # Serve the file
            try:
                size = os.path.getsize(filepath)
                self.send_response(200)
                self.send_header('Content-type', 'audio/mpeg')
                self.send_header('Content-Length', size)
                self.end_headers()
                with open(filepath, 'rb') as f:
                    self.wfile.write(f.read())
            except Exception as e:
                print(f"[ERROR] Failed to serve {filepath}: {e}")
                if not self.wfile.closed:
                    self.send_error(500, f"Error serving file: {e}")

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
        elif self.path == '/api/precache_words':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            try:
                data = json.loads(post_data.decode('utf-8'))
                words = data.get('words', [])
                rate = data.get('rate', '+0%')
                
                def process_word(word):
                    voice = "en-US-AriaNeural"
                    word = word.lower().strip()
                    safe_word = "".join([c for c in word if c.isalnum() or c in (' ', '-', '_')]).strip()
                    safe_rate = rate.replace('+', 'p').replace('-', 'm').replace('%', '')
                    filename = f"{safe_word}_{safe_rate}.mp3"
                    filepath = os.path.join(SOUNDS_DIR, filename)

                    # Check if exists AND is valid
                    if not os.path.exists(filepath) or os.path.getsize(filepath) == 0:
                        if os.path.exists(filepath):
                            try:
                                os.remove(filepath)
                            except Exception:
                                pass
                            print(f"[REGEN] Batch deleting empty file: '{filename}'")

                        print(f"[BATCH] Generating: '{word}'")
                        success, error = robust_generate_tts(word, filepath, rate, voice)
                        
                        if success:
                            print(f"[BATCH] SUCCESS: {filename}")
                        else:
                            print(f"[BATCH ERROR] TTS Error for '{word}': {error}")
                        
                        # Very small delay just to prevent hitting all at the exact same ms
                        import time
                        time.sleep(0.1)

                def generate_batch():
                    import concurrent.futures
                    with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
                        executor.map(process_word, words)

                # Run generation in a separate thread so API returns immediately
                print(f"[API] Starting background pre-cache for {len(words)} words with 20 threads.")
                threading.Thread(target=generate_batch, daemon=True).start()

                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "started", "count": len(words)}).encode())

            except Exception as e:
                self.send_response(500)
                self.wfile.write(str(e).encode())
        else:
            self.send_error(404)

class ThreadedHTTPServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    pass

def run_server():
    """
    Start the multi-threaded HTTP server on localhost:8000.
    
    Change working directory to the script's location, opens the default
    web browser, and serves forever until interrupted.
    """

    os.chdir(DIRECTORY)
    ThreadedHTTPServer.allow_reuse_address = True
    
    with ThreadedHTTPServer(("", PORT), Handler) as httpd:
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Multi-threaded Server started at http://localhost:{PORT}")
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Serving from: {DIRECTORY}")
        
        # Only open browser if not in a headless/deployment environment
        if os.environ.get("OPEN_BROWSER", "true").lower() == "true":
            print(f"[{datetime.now().strftime('%H:%M:%S')}] Opening browser...")
            webbrowser.open(f"http://localhost:{PORT}")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")
            httpd.shutdown()

if __name__ == "__main__":
    run_server()
