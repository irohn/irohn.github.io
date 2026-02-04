document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const canvas = document.getElementById('game-board');
    const statusText = document.getElementById('status-text');
    const playerIndicator = document.querySelector('.player-indicator');
    const themeBtn = document.getElementById('theme-toggle');
    const settingsBtn = document.getElementById('settings-toggle');
    // const restartBtn = document.getElementById('restart-btn'); // Removed from DOM
    const settingsModal = document.getElementById('settings-modal');
    const closeSettingsBtn = document.getElementById('close-settings');
    const applySettingsBtn = document.getElementById('apply-settings');
    
    // Game Over Modal Elements
    const gameOverModal = document.getElementById('game-over-modal');
    const winnerMessage = document.getElementById('winner-message');
    const playAgainBtn = document.getElementById('play-again-btn');

    // Settings Inputs
    const boardSizeSelect = document.getElementById('board-size');
    const overlineRuleCheck = document.getElementById('overline-rule');
    const threeRuleCheck = document.getElementById('three-rule');

    // Game State
    let gameParams = {
        size: 19,
        overline: true,
        threeRule: true // Default enabled
    };

    let game = new Game(gameParams.size, gameParams.overline, gameParams.threeRule);
    const view = new View(canvas, game);

    // --- Interaction Logic ---

    canvas.addEventListener('mousemove', (e) => {
        if (game.isGameOver) {
            view.ghostPos = null;
            view.draw();
            return;
        }
        
        const pos = view.getGridCoord(e.clientX, e.clientY);
        
        // Only update if changed to avoid unnecessary redraws
        if (!view.ghostPos || view.ghostPos.x !== pos.x || view.ghostPos.y !== pos.y) {
            view.ghostPos = pos;
            view.draw();
        }
    });

    canvas.addEventListener('mouseleave', () => {
        view.ghostPos = null;
        view.draw();
    });

    canvas.addEventListener('click', (e) => {
        if (game.isGameOver) return;

        const pos = view.getGridCoord(e.clientX, e.clientY);
        
        if (game.placeStone(pos.x, pos.y)) {
            view.ghostPos = null; // Clear ghost immediately
            view.draw();
            updateUI();
            
            if (game.isGameOver) {
                setTimeout(showGameOverModal, 300);
            }
        }
    });

    function showGameOverModal() {
        let msg = "";
        if (game.winner === 0) msg = "Draw!";
        else msg = `${game.winner === 1 ? 'Black' : 'White'} Wins!`;
        
        winnerMessage.textContent = msg;
        gameOverModal.classList.remove('hidden');
    }

    function updateUI() {
        if (game.isGameOver) {
            if (game.winner === 1) statusText.textContent = "Winner: Black";
            else if (game.winner === 2) statusText.textContent = "Winner: White";
            else statusText.textContent = "Draw";
        } else {
            const player = game.currentPlayer === 1 ? 'Black' : 'White';
            statusText.textContent = `${player}'s Turn`;
            
            playerIndicator.className = `player-indicator ${player.toLowerCase()}`;
        }
    }

    function resetGame() {
        game = new Game(gameParams.size, gameParams.overline, gameParams.threeRule);
        view.updateGame(game);
        updateUI();
    }

    // --- Settings & Modal ---

    settingsBtn.addEventListener('click', () => {
        // Load current values
        boardSizeSelect.value = gameParams.size;
        overlineRuleCheck.checked = gameParams.overline;
        threeRuleCheck.checked = gameParams.threeRule;
        settingsModal.classList.remove('hidden');
    });

    const closeModal = () => settingsModal.classList.add('hidden');
    closeSettingsBtn.addEventListener('click', closeModal);
    
    // Close on click outside
    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) closeModal();
    });

    applySettingsBtn.addEventListener('click', () => {
        gameParams.size = parseInt(boardSizeSelect.value);
        gameParams.overline = overlineRuleCheck.checked;
        gameParams.threeRule = threeRuleCheck.checked;
        
        resetGame();
        closeModal();
    });

    // restartBtn.addEventListener('click', resetGame); // Removed

    // --- Game Over Modal ---
    playAgainBtn.addEventListener('click', () => {
        gameOverModal.classList.add('hidden');
        resetGame();
    });


    // --- Theme Toggle ---

    // Check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.body.setAttribute('data-theme', 'dark');
    }

    themeBtn.addEventListener('click', () => {
        const currentTheme = document.body.getAttribute('data-theme');
        if (currentTheme === 'dark') {
            document.body.setAttribute('data-theme', 'light');
        } else {
            document.body.setAttribute('data-theme', 'dark');
        }
        // Redraw canvas to update grid colors
        view.draw();
    });

    // Initial Draw
    view.draw();
});
