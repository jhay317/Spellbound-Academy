# Spellbound Academy

Spellbound Academy is an interactive, voice-enabled spelling game designed to make learning words fun and accessible. Players act as wizards casting spells (words) to duel monsters and earn mana (points) in a fantasy combat arena.

## ✨ Features

-   **Interactive Combat Arena**: Battle elemental monsters (Slimes, Goblins, Dragons, and more) by correctly spelling words. Watch your mana shield and the monster's HP. Select your wizard subclass (Storm, Fire, or Frost), each with unique magical projectile visual effects.
-   **Neural Voice Integration**: Powered by `edge-tts` for natural, high-quality neural voices. Default voice `en-US-AnaNeural` provides child-friendly speech clarity.
-   **Chanting & Speed Customization**: Accessible controls featuring speed adjustments (from 50% slower up to 30% faster) and visual alerts if audio autoplay is blocked, making spelling sounds easy to distinguish for hearing-impaired learners.
-   **Scroll of Wisdom (Dictionary Clues)**: Stuck on a word? Read descriptions and usage examples retrieved dynamically from the public Dictionary API inside an ancient scroll panel.
-   **Smart Word Selection**: A weighted mastery algorithm prioritizes words that you struggle with while gradually introducing new challenges.
-   **Visual Excellence**: Modern glassmorphism UI, a state-of-the-art interactive particle system with subclass-themed behaviors (rising embers, falling crystals, lightning sparks), and real-time incorrect letter highlighting.
-   **Progression & Stats**: Tracks mastery across grades (3-5) and levels, with persistent storage for progress and high scores.
-   **Zero-Latency Audio**: Proactive background multi-threaded pre-caching ensures audio is ready before you even see the word.
-   **Virtual Touch Keyboard**: On-screen keyboard toggle supporting touch interaction on mobile devices and tablets.
-   **PWA Ready**: Offline support and standalone installation enabled via a registered Service Worker and Web Manifest.

## 🚀 Setup & Usage

### Prerequisites
-   Python 3.8+ (Local running)
-   Docker & Docker Compose (Containerized running)

### Installation
1.  Clone the repository:
    ```bash
    git clone https://github.com/jhay317/Spellbound-Academy.git
    cd "Spelling Game"
    ```
2.  Install required dependencies:
    ```bash
    pip install -r requirements.txt
    ```

### Running Locally
1.  **Windows Virtual Environment**: Double-click `play.bat` to launch automatically via the configured `env-3-14` Python environment.
2.  **Manual Start**: Run the Python server:
    ```bash
    python server.py
    ```
    Then open `http://localhost:8000` in your web browser.

### Running with Docker
You can run Spellbound Academy containerized with Docker and Docker Compose:
```bash
docker-compose up --build
```
This starts the application on `http://localhost:8000` with container data persisted in the `spellbound_data` volume.

## 🌐 Deployment & Configuration

Spellbound Academy is designed to be easily deployable.

### Environment Variables
-   `PORT`: Port to run the server on (default: `8000`).
-   `HOST`: Host address to bind the server to (default: `0.0.0.0` in Docker, `""` for local).
-   `DATA_DIR`: Path to save user progress and scores (default: application directory).
-   `OPEN_BROWSER`: Set to `false` in production or container environments to prevent launching a web browser.

### Best Practices
-   **Persistence**: Ensure the path configured by `DATA_DIR` is mounted as a persistent volume when deploying to containerized environments (like Docker or Heroku) to preserve `user_progress.json` and `scores.json`.
-   **Caching**: Generated audio files are stored in `sounds/` inside `DATA_DIR`. It can be cached or cleared periodically.

## 🧠 Smart Selection Algorithm

The game uses a **Weighted Mastery Algorithm** to select words:
1.  **Problem Words**: Words with higher "Incorrect" counts are weighted more heavily, appearing more frequently to reinforce learning.
2.  **Recency**: Recently missed words are prioritized.
3.  **Progression**: New words from the current level are introduced gradually as mastery of existing words increases.

## 📂 Project Structure

-   `server.py`: Multi-threaded Python API & TTS generation engine with parameter sanitization.
-   `game.js`: Core game logic, state management, combat animation triggers, and speech synthesis handlers.
-   `particles.js`: Canvas-based interactive particle engine featuring themed subclass particle fields and click/tap bursts.
-   `sw.js`: Service worker handling caching of core assets for offline play.
-   `manifest.json`: Web App Manifest containing metadata for PWA installation.
-   `index.html`: Main game structure, glassmorphism layouts, combat arena canvas overlay, and UI modal dialogues.
-   `style.css`: Modern visual styling, responsiveness, dark modes, animations, and subclass layouts.
-   `words.json`: Database of 3000+ words across grades 3, 4, and 5.
-   `Dockerfile` & `docker-compose.yml`: Docker configuration files.
