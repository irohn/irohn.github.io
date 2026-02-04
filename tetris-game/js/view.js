class TetrisView {
    constructor(game, canvas, nextCanvas) {
        this.game = game;
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.nextCanvas = nextCanvas;
        this.nextCtx = nextCanvas.getContext('2d');
        
        this.cellSize = 0;
        this.resize();
        
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        // Calculate cell size based on screen height to maximize size
        // Matrix is 10x20 visible.
        const aspect = 10 / 20;
        
        // Target height: 85% of screen height
        // Subtract top bar (50px) + some margin (40px)
        const availableHeight = window.innerHeight - 90;
        const availableWidth = window.innerWidth - 200; // Account for side panel
        
        let h = availableHeight;
        let w = h * aspect;
        
        // If width is too wide for screen, scale down
        if (w > availableWidth) {
            w = availableWidth;
            h = w / aspect;
        }
        
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = w * dpr;
        this.canvas.height = h * dpr;
        this.canvas.style.width = `${w}px`;
        this.canvas.style.height = `${h}px`;
        this.ctx.scale(dpr, dpr);
        
        this.cellSize = w / this.game.COLS;

        // Next Piece Resize
        const nw = 80;
        const nh = 80;
        this.nextCanvas.width = nw * dpr;
        this.nextCanvas.height = nh * dpr;
        this.nextCanvas.style.width = `${nw}px`;
        this.nextCanvas.style.height = `${nh}px`;
        this.nextCtx.scale(dpr, dpr);
    }

    draw() {
        const w = this.canvas.width / (window.devicePixelRatio || 1);
        const h = this.canvas.height / (window.devicePixelRatio || 1);
        
        this.ctx.clearRect(0, 0, w, h);
        
        // Draw Grid Background
        this.ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--board-grid').trim();
        this.ctx.lineWidth = 0.5;
        this.ctx.beginPath();
        for (let x = 0; x <= this.game.COLS; x++) {
            this.ctx.moveTo(x * this.cellSize, 0);
            this.ctx.lineTo(x * this.cellSize, h);
        }
        for (let y = 0; y <= this.game.VISIBLE_ROWS; y++) {
            this.ctx.moveTo(0, y * this.cellSize);
            this.ctx.lineTo(w, y * this.cellSize);
        }
        this.ctx.stroke();

        // Draw Board (only visible part)
        // Board has 40 rows. Visible start at 20.
        // board[20] is row 0 on screen.
        
        const visibleStart = this.game.ROWS - this.game.VISIBLE_ROWS;
        
        for (let r = 0; r < this.game.VISIBLE_ROWS; r++) {
            for (let c = 0; c < this.game.COLS; c++) {
                const cell = this.game.board[visibleStart + r][c];
                if (cell !== 0) {
                    this.drawBlock(this.ctx, c, r, SHAPES[cell].color);
                }
            }
        }

        // Draw Ghost Piece
        if (this.game.ghostPiece) {
            const { x, y, shape, type } = this.game.ghostPiece;
            const screenY = y - visibleStart;
            this.drawPiece(this.ctx, x, screenY, shape, COLORS.GHOST, true);
        }

        // Draw Active Piece
        if (this.game.activePiece) {
            const { x, y, shape, type } = this.game.activePiece;
            const screenY = y - visibleStart;
            this.drawPiece(this.ctx, x, screenY, shape, SHAPES[type].color);
        }

        // Draw Next Piece
        this.drawNextPiece();
    }

    drawPiece(ctx, x, y, shape, color, isGhost = false) {
        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (shape[r][c]) {
                    // Skip if above screen
                    if (y + r < 0) continue;
                    this.drawBlock(ctx, x + c, y + r, color, isGhost);
                }
            }
        }
    }

    drawBlock(ctx, x, y, color, isGhost = false) {
        const size = this.cellSize;
        const px = x * size;
        const py = y * size;

        if (isGhost) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.strokeStyle = color; // Used as outline color
            ctx.lineWidth = 1;
            ctx.strokeRect(px + 1, py + 1, size - 2, size - 2);
            ctx.fillRect(px + 1, py + 1, size - 2, size - 2);
        } else {
            // Bevel effect
            ctx.fillStyle = color;
            ctx.fillRect(px, py, size, size);

            // Highlight
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(px + size, py);
            ctx.lineTo(px, py + size);
            ctx.fill();

            // Shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
            ctx.beginPath();
            ctx.moveTo(px + size, py + size);
            ctx.lineTo(px + size, py);
            ctx.lineTo(px, py + size);
            ctx.fill();
            
            // Border
            ctx.strokeStyle = 'rgba(0,0,0,0.1)';
            ctx.strokeRect(px, py, size, size);
        }
    }

    drawNextPiece() {
        const w = this.nextCanvas.width / (window.devicePixelRatio || 1);
        const h = this.nextCanvas.height / (window.devicePixelRatio || 1);
        this.nextCtx.clearRect(0, 0, w, h);
        
        if (!this.game.nextPiece) return;

        const type = this.game.nextPiece.type;
        const shape = SHAPES[type].blocks;
        const color = SHAPES[type].color;
        
        // Center the piece in 4x4 or 3x3 grid
        // Approx size is 20px per block?
        const blockSize = 20;
        
        // Calculate offsets to center
        // Grid is roughly 4 blocks wide max
        const pieceW = shape[0].length * blockSize;
        const pieceH = shape.length * blockSize;
        
        const offsetX = (w - pieceW) / 2;
        const offsetY = (h - pieceH) / 2;

        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (shape[r][c]) {
                    this.nextCtx.fillStyle = color;
                    this.nextCtx.fillRect(offsetX + c * blockSize, offsetY + r * blockSize, blockSize - 1, blockSize - 1);
                }
            }
        }
    }
}
