# Spellbound Academy

Spellbound Academy is an interactive, voice-enabled spelling game designed to make learning words fun. Players act as wizards casting spells (words) and earning mana (points).

## Features

-   **Interactive Gameplay**: Type the spoken words to cast spells.
-   **Voice Integration**: Uses browser Text-to-Speech to pronounce words.
-   **Progression System**: Tracks correct/incorrect answers and prioritizes problem words.
-   **Smart Difficulty**: "Common" words and grade-level specific lists.
-   **Leaderboard**: Tracks top scores locally.
-   **Visual Feedback**: Animations for correct/incorrect answers and progress tracking.

## Setup & Usage

### Prerequisites
-   Python 3.x
-   A modern web browser (Edge, Chrome, Firefox) with speech synthesis support.

### Running the Game
1.  Navigate to the project folder.
2.  Double-click `play.bat` to start the server and automatically open the game in your default browser.
    -   Alternatively, run `python server.py` in your terminal and visit `http://localhost:8000`.

## Project Structure

-   `server.py`: Simple Python HTTP server handling API requests for scores and progress.
-   `game.js`: Core game logic, state management, and UI interactions.
-   `index.html`: Main game interface structure.
-   `style.css`: Visual styling and animations.
-   `words.json`: Database of words categorized by grade/difficulty.
-   `scores.json`: Local storage for leaderboard data (auto-generated).
-   `user_progress.json`: Local storage for player word statistics (auto-generated).
