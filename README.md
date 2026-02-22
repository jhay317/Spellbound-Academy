# Spellbound Academy

Spellbound Academy is an interactive, voice-enabled spelling game designed to make learning words fun. Players act as wizards casting spells (words) and earning mana (points).

## Features

-   **Interactive Gameplay**: Type the spoken words to cast spells.
-   **Neural Voice Integration**: Uses `edge-tts` for high-quality, natural neural voices.
-   **Smart Word Selection**: Prioritizes problem words and introduces new words using a weighted selection algorithm.
-   **Progression System**: Tracks correct/incorrect answers and prioritizes problem words across levels.
-   **Smart Difficulty**: "Common" words and grade-level specific lists.
-   **Multi-threaded Server**: Handles audio pre-caching in the background for zero-latency gameplay.
-   **Leaderboard**: Tracks top scores locally.
-   **Visual Feedback**: Animations for correct/incorrect answers, letter-by-letter highlighting, and progress tracking.

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
