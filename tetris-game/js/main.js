document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const canvas = document.getElementById('tetris-board');
    const nextCanvas = document.getElementById('next-piece');
    const scoreEl = document.getElementById('score');
    const levelEl = document.getElementById('level');
    const linesEl = document.getElementById('lines');
    
    // UI Elements
    const themeBtn = document.getElementById('theme-toggle');
    const settingsBtn = document.getElementById('settings-toggle');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettingsBtn = document.getElementById('close-settings');
    const applySettingsBtn = document.getElementById('apply-settings');
    
    const gameOverModal = document.getElementById('game-over-modal');
    const finalScoreEl = document.getElementById('final-score');
    const playAgainBtn = document.getElementById('play-again-btn');

    // Settings
    const startLevelSelect = document.getElementById('start-level');
    const ghostCheck = document.getElementById('ghost-piece');

    // Game Objects
    let game = null;
    let view = null;
    let requestFrameId = null;
    let lastTime = 0;
    let dropCounter = 0;
    
    // --- Game Loop ---

    function startNewGame() {
        if (requestFrameId) cancelAnimationFrame(requestFrameId);
        
        const startLevel = parseInt(startLevelSelect.value);
        const ghostEnabled = ghostCheck.checked;
        
        game = new TetrisGame(startLevel, ghostEnabled);
        view = new TetrisView(game, canvas, nextCanvas);
        
        lastTime = 0;
        dropCounter = 0;
        
        updateStats();
        view.draw();
        
        gameOverModal.classList.add('hidden');
        
        requestFrameId = requestAnimationFrame(update);
    }

    function update(time) {
        if (!lastTime) lastTime = time;
        const deltaTime = time - lastTime;
        lastTime = time;

        if (!game.gameOver) {
            // Gravity
            // Calculate drop interval based on level (simplified curve)
            // Lvl 1: 1000ms, Lvl 15: ~100ms
            const speed = Math.max(100, Math.pow(0.8 - ((game.level - 1) * 0.007), game.level - 1) * 1000);
            
            dropCounter += deltaTime;
            if (dropCounter > speed) {
                game.move(0, 1);
                dropCounter = 0;
            }
            
            game.update(time); // Lock timer check
            
            if (game.gameOver) {
                endGame();
            }
        }
        
        view.draw();
        updateStats();
        
        if (!game.gameOver) {
            requestFrameId = requestAnimationFrame(update);
        }
    }

    function updateStats() {
        scoreEl.textContent = game.score;
        levelEl.textContent = game.level;
        linesEl.textContent = game.lines;
    }

    function endGame() {
        cancelAnimationFrame(requestFrameId);
        finalScoreEl.textContent = game.score;
        gameOverModal.classList.remove('hidden');
    }

    // --- Inputs ---

    document.addEventListener('keydown', (e) => {
        if (game.gameOver || settingsModal.classList.contains('hidden') === false) return;

        switch(e.key) {
            case KEYS.LEFT:
                game.move(-1, 0);
                break;
            case KEYS.RIGHT:
                game.move(1, 0);
                break;
            case KEYS.DOWN:
                game.move(0, 1);
                dropCounter = 0; // Reset gravity timer
                game.score += 1; // 1 point for soft drop
                break;
            case KEYS.UP:
                game.rotate(1); // CW
                break;
            case KEYS.Z:
            case KEYS.CTRL:
                game.rotate(-1); // CCW
                break;
            case ' ': // Space
                game.hardDrop();
                dropCounter = 0; // Force immediate lock logic usually handles this, but good to reset
                break;
        }
    });

    // --- Settings & UI ---

    settingsBtn.addEventListener('click', () => {
        settingsModal.classList.remove('hidden');
        // Pause game? Simple implementation: just keep running or pause update
        // We'll leave it running but input blocked
    });

    const closeModal = () => settingsModal.classList.add('hidden');
    closeSettingsBtn.addEventListener('click', closeModal);
    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) closeModal();
    });

    applySettingsBtn.addEventListener('click', () => {
        closeModal();
        startNewGame();
    });

    playAgainBtn.addEventListener('click', startNewGame);

    // Theme
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.body.setAttribute('data-theme', 'dark');
    }

    themeBtn.addEventListener('click', () => {
        const currentTheme = document.body.getAttribute('data-theme');
        document.body.setAttribute('data-theme', currentTheme === 'dark' ? 'light' : 'dark');
        view.draw();
    });

    // Start
    startNewGame();
});
