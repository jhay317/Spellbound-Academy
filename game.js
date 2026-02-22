/**
 * Main Game Controller
 * Manages game state, user input, voice synthesis, and UI updates.
 */
class Game {
    constructor() {
        this.state = {
            grade: 3,
            levelId: null,
            playerName: 'Wizard',
            words: {},
            wordStats: {},
            currentWord: '',
            input: [],
            score: 0,
            streak: 0,
            isSpeaking: false
        };

        this.wordList = [];
        this.audio = new Audio();

        this.elements = {
            screens: {
                menu: document.getElementById('screen-menu'),
                levels: document.getElementById('screen-levels'),
                game: document.getElementById('screen-game'),
                end: document.getElementById('screen-end'),
                leaderboard: document.getElementById('screen-leaderboard')
            },
            inputContainer: document.getElementById('input-container'),
            wordTarget: document.getElementById('word-target'),
            score: document.getElementById('score-display'),
            streak: document.getElementById('streak-display'),
            speakBtn: document.getElementById('btn-speak'),
            feedback: document.getElementById('feedback-message'),
            nameInput: document.getElementById('player-name'),
            finalScore: document.getElementById('final-score'),
            leaderboard: document.getElementById('leaderboard-list'),
            leaderboardFull: document.getElementById('leaderboard-full-list'),
            progressFill: document.getElementById('progress-fill'),
            progressText: document.getElementById('progress-text'),

            levelGradeTitle: document.getElementById('level-grade-title'),
            levelsGrid: document.getElementById('levels-grid')
        };

        this.init();
    }

    /**
     * Initialize the game: load voices, load words, and bind events.
     */
    async init() {
        // Load words
        try {
            const response = await fetch('words.json');
            const data = await response.json();
            this.state.words = data.grades;
            console.log("Words loaded:", this.state.words);
        } catch (e) {
            console.error("Failed to load words", e);
            alert("Error loading magic spells (words.json missing?)");
        }

        // Event Listeners
        window.addEventListener('keydown', (e) => this.handleInput(e));
        this.elements.speakBtn.addEventListener('click', () => this.speakWord());
    }

    // loadVoices removed - using server-side neural voices now

    /**
     * Start the flow: Select Grade -> Show Levels
     * @param {string|number} difficulty - Grade level (e.g. 3) or "common"
     */
    async startGame(difficulty) {
        const name = this.elements.nameInput.value.trim();
        if (name) {
            this.state.playerName = name;
        }

        // Load stats for this user
        await this.loadUserProgress();

        this.state.grade = difficulty;
        this.showLevelSelection();
    }

    showLevelSelection() {
        this.switchScreen('levels');

        let gradeKey = this.state.grade.toString();
        const gradeData = this.state.words[gradeKey];

        if (!gradeData) {
            console.error("Grade data not found for:", gradeKey);
            return;
        }

        this.elements.levelGradeTitle.textContent = gradeData.title;
        const grid = this.elements.levelsGrid;
        grid.innerHTML = '';

        let previousLevelMastered = true;

        gradeData.levels.forEach((level, index) => {
            const btn = document.createElement('div');
            btn.className = 'level-btn';

            const totalWords = level.words.length;
            const masteredCount = level.words.filter(w => {
                const stats = this.state.wordStats[w];
                return stats && stats.correct > stats.incorrect;
            }).length;

            const percent = totalWords > 0 ? (masteredCount / totalWords) : 0;
            const isMastered = percent >= 0.9;
            const isUnlocked = previousLevelMastered;

            if (!isUnlocked) {
                btn.classList.add('locked');
                btn.innerHTML = `<span>🔒 Level ${index + 1}</span>`;
            } else {
                btn.onclick = () => this.startLevel(level);
                if (isMastered) btn.classList.add('completed');

                btn.innerHTML = `
                    <span style="font-size: 1.5rem; font-weight: bold;">${index + 1}</span>
                    <span class="level-info">${masteredCount}/${totalWords}</span>
                `;
            }

            // Unlock next if at least 70% of this level is mastered
            if (percent < 0.7) {
                previousLevelMastered = false;
            }

            grid.appendChild(btn);
        });
    }

    startLevel(levelData) {
        this.state.levelId = levelData.id;
        this.wordList = [...levelData.words];
        this.wordList.sort(() => Math.random() - 0.5);

        this.state.score = 0;
        this.state.streak = 0;

        this.updateStats();
        this.updateProgress();

        this.switchScreen('game');
        this.nextWord();

        // Proactive background pre-caching for the whole level
        this.precacheLevelWords(this.wordList);
    }

    async precacheLevelWords(words) {
        try {
            await fetch('/api/precache_words', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ words: words })
            });
        } catch (e) {
            console.warn("Pre-caching failed (background process)", e);
        }
    }

    switchScreen(screenName) {
        Object.values(this.elements.screens).forEach(el => el.classList.remove('active'));
        this.elements.screens[screenName].classList.add('active');
    }

    nextWord() {
        if (this.wordList.length === 0) {
            this.endGame();
            return;
        }

        // Smart Word Selection
        this.selectNextWord();

        this.state.input = [];
        this.renderInputSlots();

        // Auto-speak the word after a slight delay
        setTimeout(() => this.speakWord(), 500);

        // Pre-fetch the NEXT word in the list to trigger server generation early
        if (this.wordList.length > 0) {
            const nextCandidate = this.wordList[0];
            // Just hit the endpoint to trigger cache; don't need the response
            fetch(`/api/speak?word=${encodeURIComponent(nextCandidate)}`).catch(() => { });
        }

        // Debug: Log the word
        console.log("Current spell:", this.state.currentWord);
    }

    renderInputSlots() {
        const container = this.elements.inputContainer;
        container.innerHTML = '';

        // Create a slot for each letter of the target word
        for (let i = 0; i < this.state.currentWord.length; i++) {
            const slot = document.createElement('div');
            slot.className = 'letter-slot';
            slot.dataset.index = i;
            container.appendChild(slot);
        }
    }

    updateInputDisplay() {
        const slots = document.querySelectorAll('.letter-slot');
        slots.forEach((slot, index) => {
            if (index < this.state.input.length) {
                slot.textContent = this.state.input[index];
                slot.classList.add('filled');
            } else {
                slot.textContent = '';
                slot.classList.remove('filled');
            }
        });
    }

    handleInput(e) {
        // Only ignore input if not in game screen
        if (!this.elements.screens.game.classList.contains('active')) return;

        const key = e.key;

        // Handle Backspace
        if (key === 'Backspace') {
            this.state.input.pop();
            this.updateInputDisplay();
            return;
        }

        // Handle Letters (A-Z)
        if (key.length === 1 && key.match(/[a-z]/i)) {
            if (this.state.input.length < this.state.currentWord.length) {
                this.state.input.push(key.toLowerCase());
                this.updateInputDisplay();

                // Check word completion
                if (this.state.input.length === this.state.currentWord.length) {
                    this.checkWord();
                }
            }
        }
    }

    /**
     * Validate the current user input against the target word.
     * Triggers success or failure flows.
     */
    checkWord() {
        const attempt = this.state.input.join('');
        const target = this.state.currentWord.toLowerCase();

        if (attempt === target) {
            this.handleSuccess();
            this.updateWordStats(target, true);
            this.updateProgress();
        } else {
            this.handleFailure();
            this.updateWordStats(target, false);
        }
    }

    handleSuccess() {
        // Visuals
        const slots = document.querySelectorAll('.letter-slot');
        slots.forEach(s => s.classList.add('correct'));

        this.showFeedback("✨ Excellent!");

        // Stats
        this.state.score += 10 + (this.state.streak * 2);
        this.state.streak++;
        this.updateStats();

        // Sound? (Optional)

        // Next word after delay
        setTimeout(() => {
            this.nextWord();
        }, 1500);
    }

    handleFailure() {
        const slots = document.querySelectorAll('.letter-slot');
        const targetWord = this.state.currentWord.toLowerCase();

        slots.forEach((slot, index) => {
            // Check if this specific letter is wrong
            if (this.state.input[index] !== targetWord[index]) {
                slot.classList.add('wrong');
            }
        });

        // Shake animation reset
        setTimeout(() => {
            slots.forEach(s => s.classList.remove('wrong'));
            // Clear input on fail? Or let them backspace?
            // Let's clear for now to force retry
            this.state.input = [];
            this.updateInputDisplay();
        }, 500);

        this.state.streak = 0;
        this.updateStats();
        this.showFeedback("Try Again!");

        // Diction help: Re-speak slower on fail
        this.speakWord(this.state.currentWord, "-20%");
    }

    /**
     * Speak a word using the server-side TTS endpoint.
     * Falls back to browser-built-in TTS if the server fails.
     * @param {string} word - The word to speak
     * @param {string} rate - Speed adjustment (e.g. "+0%", "-20%")
     */
    speakWord(word = this.state.currentWord, rate = "+0%") {
        if (!word) return;

        // Construct the API URL
        const url = `/api/speak?word=${encodeURIComponent(word)}&rate=${encodeURIComponent(rate)}`;

        console.log(`[TTS] Requesting word: "${word}" (Rate: ${rate})`);

        // Stop any current playback
        this.audio.pause();
        this.audio.src = url;

        this.audio.play().catch(e => {
            console.warn("[TTS] Server audio failed, falling back to browser voice:", e);
            this.speakWithBrowserFallback(word, rate);
        });
    }

    /**
     * Fallback mechanism using the browser's built-in SpeechSynthesis API.
     */
    speakWithBrowserFallback(word, rateString) {
        if (!window.speechSynthesis) {
            console.error("[TTS] Browser does not support SpeechSynthesis.");
            return;
        }

        // Cancel existing speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(word);

        // Convert edge-tts rate (+0%, -20%) to speech api rate (0.1 to 10)
        let rate = 1.0;
        try {
            const percent = parseInt(rateString.replace('%', ''));
            rate = 1.0 + (percent / 100);
            if (rate < 0.1) rate = 0.1;
            if (rate > 2.0) rate = 2.0; // Keep it reasonable
        } catch (e) { }

        utterance.rate = rate;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        // Choose a female/pleasant voice if possible
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(v => v.lang.startsWith('en') && v.name.includes('Google')) || voices[0];
        if (preferredVoice) utterance.voice = preferredVoice;

        window.speechSynthesis.speak(utterance);
    }

    showFeedback(text) {
        const el = this.elements.feedback;
        el.textContent = text;
        el.classList.add('show');
        setTimeout(() => el.classList.remove('show'), 1000);
    }

    updateStats() {
        this.elements.score.textContent = `Mana: ${this.state.score}`;
        this.elements.streak.textContent = `Combo: ${this.state.streak}`;
    }

    updateProgress() {
        if (!this.state.levelId || !this.state.grade) return;

        const gradeKey = this.state.grade.toString();
        const gradeData = this.state.words[gradeKey];
        if (!gradeData) return;

        // Find the current level data
        const levelData = gradeData.levels.find(l => l.id === this.state.levelId);
        if (!levelData) return;

        const totalWords = levelData.words.length;
        const masteredWords = levelData.words.filter(w => {
            const stats = this.state.wordStats[w];
            return stats && stats.correct > stats.incorrect;
        }).length;

        const percentage = totalWords === 0 ? 0 : Math.round((masteredWords / totalWords) * 100);

        this.elements.progressFill.style.width = `${percentage}%`;
        this.elements.progressText.textContent = `${masteredWords}/${totalWords} Mastered`;
    }

    async showLeaderboard() {
        this.switchScreen('leaderboard');
        try {
            const res = await fetch('/api/scores');
            const scores = await res.json();

            const list = this.elements.leaderboardFull;
            list.innerHTML = '';

            if (scores.length === 0) {
                list.innerHTML = '<p style="text-align:center; padding: 1rem;">No legends yet...</p>';
                return;
            }

            scores.forEach((s, i) => {
                const item = document.createElement('div');
                item.style.display = 'flex';
                item.style.justifyContent = 'space-between';
                item.style.padding = '1rem';
                item.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
                item.style.fontSize = '1.2rem';
                item.innerHTML = `
                    <span>#${i + 1} ${s.name} (${s.grade})</span>
                    <span>${s.score} Mana</span>
                `;
                list.appendChild(item);
            });
        } catch (e) {
            console.error("Failed to load leaderboard", e);
        }
    }

    quitGame() {
        this.switchScreen('menu');
        // Reload leaderboard in background
        this.loadLeaderboard();
    }

    async endGame() {
        this.elements.finalScore.textContent = `Final Mana: ${this.state.score}`;
        this.switchScreen('end');

        // Save Score
        try {
            await fetch('/api/score', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: this.state.playerName,
                    score: this.state.score,
                    grade: this.state.levelId || this.state.grade
                })
            });
            this.loadLeaderboard();
        } catch (e) {
            console.error("Failed to save score", e);
        }
    }

    async loadLeaderboard() {
        try {
            const res = await fetch('/api/scores');
            const scores = await res.json();

            const list = this.elements.leaderboard;
            list.innerHTML = '';

            if (scores.length === 0) {
                list.innerHTML = '<p style="text-align:center; padding: 1rem;">No legends yet...</p>';
                return;
            }

            scores.forEach((s, i) => {
                const item = document.createElement('div');
                item.style.display = 'flex';
                item.style.justifyContent = 'space-between';
                item.style.padding = '0.5rem';
                item.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
                item.innerHTML = `
                    <span>#${i + 1} ${s.name} (${s.grade})</span>
                    <span>${s.score} Mana</span>
                `;
                list.appendChild(item);
            });
        } catch (e) {
            console.error("Failed to load leaderboard", e);
        }
    }

    async loadUserProgress() {
        try {
            const res = await fetch(`/api/user_progress?name=${encodeURIComponent(this.state.playerName)}`);
            const data = await res.json();
            this.state.wordStats = data || {};
            console.log("Loaded stats for", this.state.playerName, this.state.wordStats);
        } catch (e) {
            console.error("Failed to load user progress", e);
            this.state.wordStats = {};
        }
    }

    /**
     * Update mastery stats for a word and sync with the server.
     * @param {string} word - The target word
     * @param {boolean} correct - Whether the user spelled it correctly
     */
    async updateWordStats(word, correct) {
        try {
            // Update local state immediately
            if (!this.state.wordStats[word]) {
                this.state.wordStats[word] = { correct: 0, incorrect: 0, last_seen: 0 };
            }
            if (correct) this.state.wordStats[word].correct++;
            else this.state.wordStats[word].incorrect++;
            this.state.wordStats[word].last_seen = Date.now() / 1000;

            // Sync with server
            await fetch('/api/update_word_stats', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: this.state.playerName,
                    word: word,
                    correct: correct
                })
            });
        } catch (e) {
            console.error("Failed to update word stats", e);
        }
    }

    /**
     * Smart Word Selection Algorithm
     * Prioritizes words based on past performance:
     * 1. Problem words (incorrect > correct) are prioritized.
     * 2. New words (never seen) are high priority.
     * 3. Mastered words appear less frequently.
     * Uses a weighted random selection implementation.
     */
    selectNextWord() {
        // We want to pick a word from this.wordList but essentially "weighted"
        // Factors:
        // 1. Problem words (incorrect > correct) -> HIGHEST Priority
        // 2. New words (no stats) -> HIGH Priority
        // 3. Known words (correct > incorrect) -> LOW Priority

        // Also avoid repetition: if we just saw it, don't show it again immediately.
        // But since this.wordList is a "deck" we are popping from, we naturally avoid immediate repeats 
        // until the deck is reset. 
        // HOWEVER, the logic moves from "pop the top" to "find the best candidate and remove it".

        const candidates = this.wordList.map(word => {
            const stats = this.state.wordStats[word] || { correct: 0, incorrect: 0 };
            let weight = 10; // Base weight

            if (stats.incorrect > stats.correct) {
                weight += 50; // IT'S A PROBLEM!
                weight += (stats.incorrect - stats.correct) * 10;
            } else if (stats.correct === 0 && stats.incorrect === 0) {
                weight += 20; // New word
            } else {
                // Known word
                weight -= (stats.correct - stats.incorrect) * 2;
                if (weight < 1) weight = 1;
            }

            return { word, weight };
        });

        // Weighted Random Selection
        const totalWeight = candidates.reduce((sum, c) => sum + c.weight, 0);
        let random = Math.random() * totalWeight;

        let selectedWord = candidates[0].word;
        for (const c of candidates) {
            random -= c.weight;
            if (random <= 0) {
                selectedWord = c.word;
                break;
            }
        }

        // Remove selected from list
        this.state.currentWord = selectedWord;
        this.wordList = this.wordList.filter(w => w !== selectedWord);

        console.log(`Selected: ${selectedWord} (Total candidates: ${this.wordList.length + 1})`);
    }
}

const game = new Game();
