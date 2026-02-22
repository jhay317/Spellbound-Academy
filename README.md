# Spellbound Academy

Spellbound Academy is an interactive, voice-enabled spelling game designed to make learning words fun. Players act as wizards casting spells (words) and earning mana (points).

## Features

-   **Interactive Gameplay**: Type the spoken words to cast spells with smooth animations.
-   **Neural Voice Integration**: Uses `edge-tts` for high-quality, natural neural voices with adjustable rates.
-   **TTS Fallback Implementation**: Automatically falls back to browser-built-in speech synthesis if the server TTS endpoint is unavailable.
-   **Smart Word Selection**: Prioritizes problem words and introduces new words using a weighted selection algorithm.
-   **Progression System**: Tracks correct/incorrect answers and prioritizes problem words across levels with persistent storage in `user_progress.json`.
-   **Expanded Word Database**: Includes over 1000 words per grade (for grades 3, 4, and 5), organized into difficulty levels.
-   **Multi-threaded Server**: Handles audio pre-caching in the background for zero-latency gameplay, now with explicit background worker logging.
-   **Dynamic Leaderboard**: Tracks top scores locally with a visual rank display.
-   **Rich Visual Feedback**: Glassmorphism UI, particle effects, and letter-by-letter highlighting for incorrect answers.

## Setup & Usage

### Prerequisites
-   Python 3.x
-   A modern web browser (Edge, Chrome, Firefox) with speech synthesis support.

### Installation
1.  Navigate to the project folder.
2.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```

### Running the Game
1.  Navigate to the project folder.
2.  Double-click `play.bat` to start the server and automatically open the game in your default browser.
    -   Alternatively, run `python server.py` in your terminal and visit `http://localhost:8000`.

## Project Structure

-   `server.py`: Multi-threaded Python HTTP server handling API requests, neural TTS generation, and progress tracking.
-   `game.js`: Core game logic, including the smart word selection algorithm and state management.
-   `index.html`: Main game interface structure.
-   `style.css`: Visual styling, glassmorphism UI, and animations.
-   `words.json`: Database of words categorized by grade and difficulty levels.
-   `sounds/`: Local cache for generated neural voice MP3s.
-   `user_progress.json`: Persistent storage for individual player mastery statistics.
-   `scores.json`: Local storage for leaderboard data.
