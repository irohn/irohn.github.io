class View {
    constructor(canvas, game) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.game = game;
        this.cellSize = 0;
        this.padding = 0;
        this.ghostPos = null; // {x, y}

        this.resize();
        window.addEventListener('resize', () => {
            this.resize();
            this.draw();
        });
    }

    updateGame(game) {
        this.game = game;
        this.resize(); // Recalculate cell sizes for new board dimensions
        this.draw();
    }

    resize() {
        const container = this.canvas.parentElement;
        // Use a safety margin to prevent cutting off (shadows, padding, etc)
        const margin = 40; 
        const size = Math.min(container.clientWidth - margin, container.clientHeight - margin);
        
        // High DPI scaling
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = size * dpr;
        this.canvas.height = size * dpr;
        this.canvas.style.width = `${size}px`;
        this.canvas.style.height = `${size}px`;
        
        this.ctx.scale(dpr, dpr);

        // Calculate layout with thinner frame
        // We want frame to be approx stone size (diameter)
        // Stone diameter is approx 0.9 * cellSize
        // Let's make padding ~0.6 * cellSize
        
        // size = (game.size - 1) * cellSize + 2 * padding
        // size = (game.size - 1) * cellSize + 2 * (0.6 * cellSize)
        // size = (game.size - 1 + 1.2) * cellSize
        // cellSize = size / (game.size + 0.2)
        
        this.cellSize = size / (this.game.size + 0.2);
        this.padding = (size - (this.game.size - 1) * this.cellSize) / 2;
        
        // Ensure padding is at least enough for stone + 2px
        // But the above math guarantees proportion.
    }

    getGridCoord(mouseX, mouseY) {
        const rect = this.canvas.getBoundingClientRect();
        const x = mouseX - rect.left;
        const y = mouseY - rect.top;
        
        const col = Math.round((x - this.padding) / this.cellSize);
        const row = Math.round((y - this.padding) / this.cellSize);

        return { x: col, y: row };
    }

    draw() {
        const { width, height } = this.canvas.style; // Get CSS size
        const w = parseInt(width);
        const h = parseInt(height);

        this.ctx.clearRect(0, 0, w, h);

        // 1. Draw Board Background (handled by CSS, but we draw grid)
        
        // 2. Draw Grid with crisp lines
        this.ctx.beginPath();
        this.ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--board-line').trim();
        this.ctx.lineWidth = 1;

        // Vertical lines
        for (let i = 0; i < this.game.size; i++) {
            // Add 0.5 to coordinates to snap to pixels for 1px line
            const x = Math.floor(this.padding + i * this.cellSize) + 0.5;
            const startY = Math.floor(this.padding) + 0.5;
            const endY = Math.floor(h - this.padding) + 0.5;
            
            this.ctx.moveTo(x, startY);
            this.ctx.lineTo(x, endY);
        }

        // Horizontal lines
        for (let i = 0; i < this.game.size; i++) {
            const y = Math.floor(this.padding + i * this.cellSize) + 0.5;
            const startX = Math.floor(this.padding) + 0.5;
            const endX = Math.floor(w - this.padding) + 0.5;
            
            this.ctx.moveTo(startX, y);
            this.ctx.lineTo(endX, y);
        }
        this.ctx.stroke();

        // 3. Draw Star Points (Hoshi)
        this.drawStarPoints();

        // 4. Draw Stones
        for (let y = 0; y < this.game.size; y++) {
            for (let x = 0; x < this.game.size; x++) {
                if (this.game.board[y][x] !== 0) {
                    this.drawStone(x, y, this.game.board[y][x]);
                }
            }
        }

        // 5. Draw Ghost Stone
        if (this.ghostPos && !this.game.isGameOver) {
            const { x, y } = this.ghostPos;
            if (this.game.isValidMove(x, y)) {
                this.ctx.globalAlpha = 0.5;
                this.drawStone(x, y, this.game.currentPlayer);
                this.ctx.globalAlpha = 1.0;
            }
        }
        
        // 6. Draw Last Move Marker
        if (this.game.moves.length > 0) {
            const lastMove = this.game.moves[this.game.moves.length - 1];
            this.drawLastMoveMarker(lastMove.x, lastMove.y, lastMove.player);
        }
    }

    drawStarPoints() {
        const size = this.game.size;
        let points = [];

        if (size === 19) {
            points = [
                [3,3], [9,3], [15,3],
                [3,9], [9,9], [15,9],
                [3,15], [9,15], [15,15]
            ];
        } else if (size === 15) {
             points = [
                [3,3], [7,3], [11,3],
                [3,7], [7,7], [11,7],
                [3,11], [7,11], [11,11]
            ];
        } else if (size === 9) {
            points = [
                [2,2], [6,2],
                [4,4],
                [2,6], [6,6]
            ];
        }

        this.ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--board-line').trim();
        for (let [cx, cy] of points) {
            const x = this.padding + cx * this.cellSize;
            const y = this.padding + cy * this.cellSize;
            this.ctx.beginPath();
            this.ctx.arc(x, y, 3, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    drawStone(x, y, player) {
        const cx = this.padding + x * this.cellSize;
        const cy = this.padding + y * this.cellSize;
        const radius = this.cellSize * 0.45;

        this.ctx.beginPath();
        this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);

        // Simple gradient for 3D effect
        const grad = this.ctx.createRadialGradient(
            cx - radius/3, cy - radius/3, radius/10,
            cx, cy, radius
        );

        if (player === 1) { // Black
            grad.addColorStop(0, '#555');
            grad.addColorStop(1, '#000');
        } else { // White
            grad.addColorStop(0, '#fff');
            grad.addColorStop(1, '#ddd');
        }

        this.ctx.fillStyle = grad;
        
        // Shadow
        this.ctx.shadowColor = 'rgba(0,0,0,0.5)';
        this.ctx.shadowBlur = 4;
        this.ctx.shadowOffsetX = 2;
        this.ctx.shadowOffsetY = 2;

        this.ctx.fill();
        
        // Reset shadow
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;
    }
    
    drawLastMoveMarker(x, y, player) {
        const cx = this.padding + x * this.cellSize;
        const cy = this.padding + y * this.cellSize;
        
        this.ctx.beginPath();
        // Contrast color for marker
        this.ctx.strokeStyle = player === 1 ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.8)'; 
        this.ctx.lineWidth = 2;
        
        // Draw a small cross or circle on top
        const s = this.cellSize * 0.15;
        this.ctx.moveTo(cx - s, cy);
        this.ctx.lineTo(cx + s, cy);
        this.ctx.moveTo(cx, cy - s);
        this.ctx.lineTo(cx, cy + s);
        
        this.ctx.stroke();
    }
}
