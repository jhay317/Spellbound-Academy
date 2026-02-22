# Spellbound Academy

Spellbound Academy is an interactive, voice-enabled spelling game designed to make learning words fun. Players act as wizards casting spells (words) and earning mana (points).

## ✨ Features

-   **Interactive Gameplay**: Type the spoken words to cast spells with smooth animations.
-   **Neural Voice Integration**: Uses `edge-tts` for high-quality, natural neural voices with adjustable rates.
-   **Smart Word Selection**: A weighted algorithm prioritizes words you struggle with while introducing new challenges at the right pace.
-   **Progression System**: Tracks mastery across grades (3-5) and levels, with persistent storage in `user_progress.json`.
-   **Zero-Latency Audio**: Background multi-threaded pre-caching ensures audio is ready before you even see the word.
-   **Visual Excellence**: Glassmorphism UI, particle effects, and real-time incorrect letter highlighting.
-   **Dynamic Leaderboard**: Compete for the top spot on the local mana leaderboard.

## 🚀 Setup & Usage

### Prerequisites
-   Python 3.8+
-   A modern web browser (Edge, Chrome, Firefox)

### Installation
1.  Clone or download the repository.
2.  Install required dependencies:
    ```bash
    pip install -r requirements.txt
    ```

### Running Locally
1.  **Windows**: Double-click `play.bat` to launch.
2.  **Manual**: Run `python server.py` and open `http://localhost:8000` in your browser.

## 🌐 Deployment

Spellbound Academy is designed to be easily deployable.

### Environment Variables
-   `PORT`: Port to run the server on (default: `8000`).
-   `OPEN_BROWSER`: Set to `false` in production environments to prevent automatic browser launching.

### Best Practices
-   **Persistence**: Ensure `user_progress.json` and `scores.json` are in a persistent volume if deploying to a containerized environment (like Docker or Heroku).
-   **Caching**: The `sounds/` directory stores generated audio. It can be cleared periodically or persisted to save on re-generation time.

## 🧠 Smart Selection Algorithm

The game uses a **Weighted Mastery Algorithm** to select words:
1.  **Problem Words**: Words with higher "Incorrect" counts are weighted more heavily, appearing more frequently.
2.  **Recency**: Recently missed words are prioritized to reinforce learning.
3.  **Progression**: New words from the current level are introduced gradually as mastery of existing words increases.

## 📂 Project Structure

-   `server.py`: Multi-threaded Python API & TTS engine.
-   `game.js`: Core game logic and smart selection engine.
-   `words.json`: Database of 3000+ words across grades 3, 4, and 5.
-   `style.css`: Modern visual styling and animations.
-   `user_progress.json`: Your personal learning journey data.
