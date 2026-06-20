/**
 * Web Audio API Synth Sound Effects
 * Synthesizes vintage arcade-style chiptunes on demand with zero external dependencies.
 */
class SoundSynth {
    constructor() {
        this.ctx = null;
        this.enabled = true;
    }

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    playClick() {
        if (!this.enabled) return;
        this.init();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(450, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.08);

        gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.08);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.08);
    }

    playSuccess() {
        if (!this.enabled) return;
        this.init();
        const now = this.ctx.currentTime;
        const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5 (Major arpeggio)
        notes.forEach((freq, index) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.type = 'sine';
            osc.frequency.value = freq;
            
            const start = now + (index * 0.08);
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.15, start + 0.015);
            gain.gain.exponentialRampToValueAtTime(0.01, start + 0.2);
            
            osc.start(start);
            osc.stop(start + 0.25);
        });
    }

    playFailure() {
        if (!this.enabled) return;
        this.init();
        const now = this.ctx.currentTime;
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.linearRampToValueAtTime(50, now + 0.35);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.35);

        osc.start();
        osc.stop(now + 0.35);
    }

    playVictory() {
        if (!this.enabled) return;
        this.init();
        const now = this.ctx.currentTime;
        const melody = [
            { f: 261.63, d: 0.12 }, // C4
            { f: 329.63, d: 0.12 }, // E4
            { f: 392.00, d: 0.12 }, // G4
            { f: 523.25, d: 0.12 }, // C5
            { f: 392.00, d: 0.12 }, // G4
            { f: 523.25, d: 0.4 }   // C5
        ];

        melody.forEach((note, index) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.type = 'triangle';
            osc.frequency.value = note.f;

            const start = now + (index * 0.12);
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.15, start + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.01, start + note.d);

            osc.start(start);
            osc.stop(start + note.d);
        });
    }
}

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
            isSpeaking: false,
            
            // Subclass & Combat States
            subclass: 'storm',
            wizardHp: 100,
            enemyHp: 10,
            enemyMaxHp: 10,
            enemyName: 'Wild Slime',
            enemyAvatar: '🦠',
            keyboardVisible: false,
            settings: {
                voice: 'en-US-AnaNeural',
                rate: '+0%'
            }
        };

        this.wordList = [];
        this.audio = new Audio();
        this.synth = new SoundSynth();

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
            levelsGrid: document.getElementById('levels-grid'),

            // Combat arena
            wizardAvatar: document.getElementById('wizard-avatar'),
            wizardNameDisplay: document.getElementById('wizard-name-display'),
            wizardShield: document.getElementById('wizard-shield'),
            enemyAvatar: document.getElementById('enemy-avatar'),
            enemyName: document.getElementById('enemy-name'),
            enemyHp: document.getElementById('enemy-hp'),
            enemyHpText: document.getElementById('enemy-hp-text'),
            projectileLane: document.getElementById('projectile-lane'),

            // Wisdom Scroll
            wisdomScroll: document.getElementById('wisdom-scroll'),
            clueContent: document.getElementById('clue-content'),

            // Virtual Keyboard
            virtualKeyboard: document.getElementById('virtual-keyboard')
        };

        this.init();
    }

    /**
     * Initialize the game: load voices, load words, and bind events.
     */
    async init() {
        this.loadSettings();
        this.unlockAudio();
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

        // Initialize subclass and keyboard
        this.selectSubclass('storm');
        this.renderKeyboard();

        // Event Listeners
        window.addEventListener('keydown', (e) => this.handleInput(e));
        this.elements.speakBtn.addEventListener('click', () => this.speakWord());
    }

    loadSettings() {
        try {
            const saved = localStorage.getItem('spellbound_settings');
            if (saved) {
                this.state.settings = JSON.parse(saved);
            } else {
                this.state.settings = {
                    voice: 'en-US-AnaNeural',
                    rate: '+0%'
                };
            }
        } catch (e) {
            this.state.settings = {
                voice: 'en-US-AnaNeural',
                rate: '+0%'
            };
        }
    }

    saveSettings() {
        try {
            localStorage.setItem('spellbound_settings', JSON.stringify(this.state.settings));
        } catch (e) {
            console.error("Failed to save settings", e);
        }
    }

    unlockAudio() {
        const unlock = () => {
            this.audio.play().then(() => {
                this.audio.pause();
                this.audio.currentTime = 0;
            }).catch(() => {});
            document.removeEventListener('click', unlock);
            document.removeEventListener('pointerdown', unlock);
        };
        document.addEventListener('click', unlock);
        document.addEventListener('pointerdown', unlock);
    }

    /**
     * Set active wizard subclass and update theme styling and particles.
     */
    selectSubclass(subclass) {
        this.state.subclass = subclass;
        document.body.setAttribute('data-subclass', subclass);
        
        // Update selection UI active state
        document.querySelectorAll('.subclass-card').forEach(card => {
            card.classList.remove('active');
        });
        const activeCard = document.getElementById(`subclass-${subclass}`);
        if (activeCard) activeCard.classList.add('active');

        // Update avatar display
        const avatars = {
            storm: '🧙‍♂️⚡',
            fire: '🧙‍♂️🔥',
            frost: '🧙‍♂️❄️'
        };
        if (this.elements.wizardAvatar) {
            this.elements.wizardAvatar.textContent = avatars[subclass] || '🧙‍♂️';
        }

        // Sync subclass name display
        this.updateWizardNameDisplay();

        // Set subclass in particle system if loaded
        if (window.spellParticles) {
            window.spellParticles.setSubclass(subclass);
        }
    }

    updateWizardNameDisplay() {
        if (this.elements.wizardNameDisplay) {
            const names = {
                storm: 'Storm Wizard',
                fire: 'Fire Wizard',
                frost: 'Frost Wizard'
            };
            this.elements.wizardNameDisplay.textContent = `${this.state.playerName} (${names[this.state.subclass] || 'Wizard'})`;
        }
    }

    /**
     * Show/Hide Virtual Keyboard
     */
    toggleKeyboard() {
        this.state.keyboardVisible = !this.state.keyboardVisible;
        if (this.state.keyboardVisible) {
            this.elements.virtualKeyboard.classList.remove('hidden');
        } else {
            this.elements.virtualKeyboard.classList.add('hidden');
        }
        this.synth.playClick();
    }

    /**
     * Render virtual keyboard keys dynamically
     */
    renderKeyboard() {
        const kb = this.elements.virtualKeyboard;
        if (!kb) return;
        kb.innerHTML = '';
        const rows = [
            ['q','w','e','r','t','y','u','i','o','p'],
            ['a','s','d','f','g','h','j','k','l'],
            ['Backspace','z','x','c','v','b','n','m','Clr']
        ];
        
        rows.forEach(rowKeys => {
            const rowEl = document.createElement('div');
            rowEl.className = 'keyboard-row';
            rowKeys.forEach(key => {
                const btn = document.createElement('button');
                btn.className = `key-btn ${key.length > 1 ? 'special-key' : ''}`;
                btn.dataset.key = key.toLowerCase();
                btn.textContent = key === 'Backspace' ? '⌫' : key === 'Clr' ? 'Clear' : key.toUpperCase();
                
                // Use pointerdown to be highly responsive
                btn.onpointerdown = (e) => {
                    e.preventDefault();
                    btn.classList.add('active');
                    this.handleKeyClick(key);
                    
                    // Spawn particles at key location
                    if (window.spellParticles) {
                        window.spellParticles.emitBurst(e.clientX, e.clientY, 8);
                    }
                };
                
                btn.onpointerup = () => btn.classList.remove('active');
                btn.onpointerleave = () => btn.classList.remove('active');
                
                rowEl.appendChild(btn);
            });
            kb.appendChild(rowEl);
        });
    }

    /**
     * Key click handler for virtual keyboard
     */
    handleKeyClick(key) {
        this.synth.playClick();
        if (key === 'Backspace') {
            this.state.input.pop();
            this.updateInputDisplay();
        } else if (key === 'Clr') {
            this.state.input = [];
            this.updateInputDisplay();
        } else if (key.length === 1) {
            if (this.state.input.length < this.state.currentWord.length) {
                this.state.input.push(key.toLowerCase());
                this.updateInputDisplay();

                if (this.state.input.length === this.state.currentWord.length) {
                    this.checkWord();
                }
            }
        }
    }

    /**
     * Fetch definitions and display scroll clue using public dictionary API
     */
    async showClue() {
        const word = this.state.currentWord.toLowerCase();
        if (!word) return;

        this.synth.playClick();
        this.elements.wisdomScroll.classList.remove('hidden');
        this.elements.clueContent.innerHTML = '<span style="font-style: italic;">Consulting library index...</span>';

        try {
            const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
            if (!res.ok) throw new Error("Not found");
            const data = await res.json();
            
            const meanings = data[0].meanings;
            let html = '';
            
            // Limit to top 2 definitions
            meanings.slice(0, 2).forEach(m => {
                const part = m.partOfSpeech;
                const def = m.definitions[0].definition;
                const example = m.definitions[0].example;
                
                html += `<div style="margin-bottom: 0.8rem;">`;
                html += `<div class="clue-part">(${part})</div>`;
                html += `<div style="font-weight: 500;">${def}</div>`;
                if (example) {
                    html += `<div style="font-style: italic; font-size: 0.95rem; color: #6e543c; margin-top: 0.1rem;">"${example}"</div>`;
                }
                html += `</div>`;
            });
            
            this.elements.clueContent.innerHTML = html || 'No definition found on scroll.';
        } catch (e) {
            this.elements.clueContent.innerHTML = '<div style="font-style: italic; color: #8b0000;">The script is faded. Clue unavailable for this spell.</div>';
        }
    }

    closeClue() {
        this.synth.playClick();
        this.elements.wisdomScroll.classList.add('hidden');
    }

    /**
     * Spawn a random monster for dueling
     */
    spawnEnemy() {
        const monsters = [
            { name: 'Slime', avatar: '🦠', hp: 10 },
            { name: 'Goblin', avatar: '👹', hp: 10 },
            { name: 'Gargoyle', avatar: '🦇', hp: 12 },
            { name: 'Spider', avatar: '🕷️', hp: 8 },
            { name: 'Ghost', avatar: '👻', hp: 10 },
            { name: 'Golem', avatar: '🗿', hp: 15 },
            { name: 'Dragon', avatar: '🐉', hp: 20 }
        ];
        
        const m = monsters[Math.floor(Math.random() * monsters.length)];
        this.state.enemyName = m.name;
        this.state.enemyAvatar = m.avatar;
        this.state.enemyHp = m.hp;
        this.state.enemyMaxHp = m.hp;

        if (this.elements.enemyName) this.elements.enemyName.textContent = m.name;
        if (this.elements.enemyAvatar) {
            this.elements.enemyAvatar.textContent = m.avatar;
            this.elements.enemyAvatar.style.transform = 'scale(1)';
        }
        this.updateEnemyHpDisplay();
    }

    updateEnemyHpDisplay() {
        const percent = Math.max(0, (this.state.enemyHp / this.state.enemyMaxHp) * 100);
        if (this.elements.enemyHp) this.elements.enemyHp.style.width = `${percent}%`;
        if (this.elements.enemyHpText) this.elements.enemyHpText.textContent = `HP: ${this.state.enemyHp}/${this.state.enemyMaxHp}`;
    }

    updateWizardHpDisplay() {
        if (this.elements.wizardShield) this.elements.wizardShield.style.width = `${this.state.wizardHp}%`;
        const shieldText = document.querySelector('.mana-shield-text');
        if (shieldText) shieldText.textContent = `Shield: ${this.state.wizardHp}%`;
    }

    /**
     * Visual animation when spell is cast from Wizard to Monster
     */
    animateSpellCast(callback) {
        const lane = this.elements.projectileLane;
        if (!lane) {
            if (callback) callback();
            return;
        }

        const proj = document.createElement('div');
        proj.className = 'magic-projectile';
        
        const projEmoji = {
            storm: '⚡',
            fire: '🔥',
            frost: '❄️'
        };
        proj.textContent = projEmoji[this.state.subclass] || '✨';
        
        // Start position (wizard avatar)
        proj.style.left = '10%';
        lane.appendChild(proj);

        // Animate towards enemy avatar
        setTimeout(() => {
            proj.style.left = '85%';
            proj.style.transform = 'scale(1.5) rotate(360deg)';
        }, 50);

        // On collision with enemy
        setTimeout(() => {
            proj.remove();
            
            // Shake enemy
            const enemy = this.elements.enemyAvatar;
            if (enemy) {
                enemy.style.transform = 'scale(0.8) translateY(-10px)';
                enemy.style.filter = 'drop-shadow(0 0 25px red) invert(0.2)';
                
                // Spawn burst particles at impact coordinates
                if (window.spellParticles) {
                    const rect = enemy.getBoundingClientRect();
                    window.spellParticles.emitBurst(rect.left + rect.width/2, rect.top + rect.height/2, 20);
                }

                setTimeout(() => {
                    enemy.style.transform = 'scale(1)';
                    enemy.style.filter = '';
                }, 300);
            }

            if (callback) callback();
        }, 650);
    }

    /**
     * Shake wizard avatar and emit static fizzle particles on spelling error
     */
    animateMonsterCounter() {
        const wiz = this.elements.wizardAvatar;
        if (wiz) {
            wiz.style.transform = 'translateX(-15px)';
            wiz.style.filter = 'drop-shadow(0 0 20px var(--accent-primary))';
            
            // Emit static fizzle particles
            if (window.spellParticles) {
                const rect = wiz.getBoundingClientRect();
                window.spellParticles.emitBurst(rect.left + rect.width/2, rect.top + rect.height/2, 12);
            }

            setTimeout(() => {
                wiz.style.transform = 'translateX(0)';
                wiz.style.filter = '';
            }, 300);
        }
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
        this.updateWizardNameDisplay();

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
        this.state.wizardHp = 100;
        this.updateWizardHpDisplay();
        this.spawnEnemy();
        if (this.elements.wisdomScroll) this.elements.wisdomScroll.classList.add('hidden');

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
                body: JSON.stringify({ 
                    words: words,
                    voice: this.state.settings.voice,
                    rate: this.state.settings.rate
                })
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

        // Close Wisdom Scroll Clue
        if (this.elements.wisdomScroll) {
            this.elements.wisdomScroll.classList.add('hidden');
        }

        // Spawn new enemy if defeated
        if (this.state.enemyHp <= 0) {
            this.spawnEnemy();
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

        // Visual feedback on virtual keyboard if present
        const virtualKey = document.querySelector(`.key-btn[data-key="${key.toLowerCase()}"]`);
        if (virtualKey) {
            virtualKey.classList.add('active');
            setTimeout(() => virtualKey.classList.remove('active'), 100);
            
            // Emit particles at the virtual key location if active
            if (window.spellParticles && this.state.keyboardVisible) {
                const rect = virtualKey.getBoundingClientRect();
                window.spellParticles.emitBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, 5);
            }
        }

        // Handle Backspace
        if (key === 'Backspace') {
            this.synth.playClick();
            this.state.input.pop();
            this.updateInputDisplay();
            return;
        }

        // Handle Letters (A-Z)
        if (key.length === 1 && key.match(/[a-z]/i)) {
            this.synth.playClick();
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

        const spellNames = {
            fire: '🔥 Fireball!',
            frost: '❄️ Ice Spike!',
            storm: '⚡ Lightning Bolt!'
        };
        this.showFeedback(spellNames[this.state.subclass] || "✨ Spell Cast!");

        // Synthesize Success SFX
        this.synth.playSuccess();

        // Animate projectile and deal damage
        this.animateSpellCast(() => {
            this.state.enemyHp = Math.max(0, this.state.enemyHp - 2);
            this.updateEnemyHpDisplay();
            
            if (this.state.enemyHp <= 0) {
                this.showFeedback("💥 Defeated!");
                // Extra points for defeating a monster
                this.state.score += 20;
            }
        });

        // Stats
        this.state.score += 10 + (this.state.streak * 2);
        this.state.streak++;
        this.updateStats();

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

        // Play failure fizzle sound
        this.synth.playFailure();

        // Animate counter attack on wizard
        this.animateMonsterCounter();

        // Lose wizard shield
        this.state.wizardHp = Math.max(0, this.state.wizardHp - 20);
        this.updateWizardHpDisplay();

        // Shake animation reset
        setTimeout(() => {
            slots.forEach(s => s.classList.remove('wrong'));
            // Clear input on fail to force retry
            this.state.input = [];
            this.updateInputDisplay();
        }, 500);

        this.state.streak = 0;
        this.updateStats();
        
        if (this.state.wizardHp <= 0) {
            this.showFeedback("Shield Depleted!");
            // Siphon mana/points on shield breaking
            this.state.score = Math.max(0, this.state.score - 15);
            // Restore some shield to let them continue
            this.state.wizardHp = 40;
            setTimeout(() => this.updateWizardHpDisplay(), 800);
        } else {
            this.showFeedback("Shield Hit!");
        }
    }

    /**
     * Speak a word using the server-side TTS endpoint.
     * Falls back to browser-built-in TTS if the server fails.
     * @param {string} word - The word to speak
     * @param {string} rate - Speed adjustment (e.g. "+0%", "-20%")
     */
    speakWord(word = this.state.currentWord, rate = null) {
        if (!word) return;

        // Use configured settings if not explicitly passed
        const selectedVoice = this.state.settings.voice || "en-US-AnaNeural";
        const selectedRate = rate || this.state.settings.rate || "+0%";

        // Construct the API URL
        const url = `/api/speak?word=${encodeURIComponent(word)}&voice=${encodeURIComponent(selectedVoice)}&rate=${encodeURIComponent(selectedRate)}`;

        console.log(`[TTS] Requesting word: "${word}" (Voice: ${selectedVoice}, Rate: ${selectedRate})`);

        // Remove any blocked pulse highlight
        if (this.elements.speakBtn) {
            this.elements.speakBtn.classList.remove('pulse-highlight');
        }

        // Stop any current playback
        this.audio.pause();
        this.audio.src = url;

        this.audio.play().catch(e => {
            if (e.name === 'NotAllowedError') {
                console.warn("[TTS] Autoplay blocked by browser. Highlighting speak button.");
                if (this.elements.speakBtn) {
                    this.elements.speakBtn.classList.add('pulse-highlight');
                }
            } else {
                console.warn("[TTS] Server audio failed, falling back to browser voice:", e);
                this.speakWithBrowserFallback(word, selectedRate);
            }
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

        // Choose a pleasant English voice
        const findBestVoice = () => {
            const list = window.speechSynthesis.getVoices();
            return list.find(v => v.lang.startsWith('en') && v.name.includes('Natural')) ||
                   list.find(v => v.lang.startsWith('en') && v.name.includes('Google')) ||
                   list.find(v => v.lang.startsWith('en') && v.name.includes('Microsoft')) ||
                   list.find(v => v.lang.startsWith('en')) ||
                   list[0];
        };

        const preferredVoice = findBestVoice();
        if (preferredVoice) {
            utterance.voice = preferredVoice;
            console.log(`[TTS Fallback] Using local voice: ${preferredVoice.name}`);
        }

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

                const nameSpan = document.createElement('span');
                nameSpan.textContent = `#${i + 1} ${s.name} (${s.grade})`;

                const scoreSpan = document.createElement('span');
                scoreSpan.textContent = `${s.score} Mana`;

                item.appendChild(nameSpan);
                item.appendChild(scoreSpan);
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
        this.synth.playVictory();
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

                const nameSpan = document.createElement('span');
                nameSpan.textContent = `#${i + 1} ${s.name} (${s.grade})`;

                const scoreSpan = document.createElement('span');
                scoreSpan.textContent = `${s.score} Mana`;

                item.appendChild(nameSpan);
                item.appendChild(scoreSpan);
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

    openSettings() {
        this.synth.playClick();
        
        // Load settings values into UI fields
        document.getElementById('settings-voice-select').value = this.state.settings.voice;
        
        // Rate range slider needs to map to percentage
        let rateVal = 0;
        try {
            rateVal = parseInt(this.state.settings.rate.replace('%', ''));
            if (isNaN(rateVal)) rateVal = 0;
        } catch (e) {}
        
        document.getElementById('settings-rate-slider').value = rateVal;
        this.updateRateSliderLabel(rateVal);

        document.getElementById('settings-modal').classList.remove('hidden');
    }

    updateRateSliderLabel(value) {
        const val = parseInt(value);
        const el = document.getElementById('settings-rate-value');
        if (!el) return;

        if (val === 0) {
            el.textContent = "Normal Speed";
        } else if (val < 0) {
            el.textContent = `${Math.abs(val)}% Slower`;
        } else {
            el.textContent = `${val}% Faster`;
        }
    }

    previewVoiceSelection() {
        this.synth.playClick();
    }

    testCurrentVoice() {
        const select = document.getElementById('settings-voice-select');
        const slider = document.getElementById('settings-rate-slider');
        
        const tempVoice = select.value;
        const tempRateVal = parseInt(slider.value);
        const tempRate = (tempRateVal >= 0 ? '+' : '') + tempRateVal + '%';

        // Play preview sentence
        const phrase = "Spellbound Academy";
        const url = `/api/speak?word=${encodeURIComponent(phrase)}&voice=${encodeURIComponent(tempVoice)}&rate=${encodeURIComponent(tempRate)}`;
        
        console.log(`[TTS Preview] Testing voice: ${tempVoice} with rate: ${tempRate}`);
        
        const testAudio = new Audio(url);
        testAudio.play().catch(e => {
            console.warn("[TTS Preview] Preview failed, using fallback:", e);
            
            // Fallback preview
            if (window.speechSynthesis) {
                window.speechSynthesis.cancel();
                const utterance = new SpeechSynthesisUtterance(phrase);
                
                let rate = 1.0 + (tempRateVal / 100);
                if (rate < 0.1) rate = 0.1;
                if (rate > 2.0) rate = 2.0;
                utterance.rate = rate;

                const list = window.speechSynthesis.getVoices();
                const preferredVoice = list.find(v => v.lang.startsWith('en') && v.name.includes('Natural')) ||
                                       list.find(v => v.lang.startsWith('en') && v.name.includes('Google')) ||
                                       list.find(v => v.lang.startsWith('en')) ||
                                       list[0];
                if (preferredVoice) utterance.voice = preferredVoice;

                window.speechSynthesis.speak(utterance);
            }
        });
    }

    closeSettings(save = false) {
        this.synth.playClick();
        
        if (save) {
            const voice = document.getElementById('settings-voice-select').value;
            const rateVal = parseInt(document.getElementById('settings-rate-slider').value);
            const rate = (rateVal >= 0 ? '+' : '') + rateVal + '%';
            
            this.state.settings = { voice, rate };
            this.saveSettings();
            
            // If they are in gameplay and they saved settings, re-speak current word using new settings
            if (this.elements.screens.game.classList.contains('active') && this.state.currentWord) {
                setTimeout(() => this.speakWord(), 300);
            }
        }
        
        document.getElementById('settings-modal').classList.add('hidden');
    }
}

const game = new Game();
