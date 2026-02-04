class TetrisGame {
    constructor(startLevel = 1, ghostEnabled = true) {
        this.ROWS = 40; // 20 hidden + 20 visible
        this.COLS = 10;
        this.VISIBLE_ROWS = 20;
        
        this.board = Array.from({length: this.ROWS}, () => Array(this.COLS).fill(0));
        
        this.score = 0;
        this.lines = 0;
        this.level = startLevel;
        this.gameOver = false;
        this.ghostEnabled = ghostEnabled;

        this.bag = [];
        this.activePiece = null;
        this.nextPiece = null;
        this.ghostPiece = null;

        this.lockDelay = 500; // ms
        this.lockTimer = null;
        this.manipulationCount = 0; // For Move Reset
        
        this.fillBag();
        this.spawnPiece();
    }

    fillBag() {
        const shapes = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];
        // Shuffle
        for (let i = shapes.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shapes[i], shapes[j]] = [shapes[j], shapes[i]];
        }
        this.bag.push(...shapes);
    }

    getNextPieceType() {
        if (this.bag.length === 0) {
            this.fillBag();
        }
        return this.bag.shift();
    }

    spawnPiece() {
        // If we have a next piece, use it. Otherwise get one.
        // This is for the very first spawn.
        const type = this.nextPiece ? this.nextPiece.type : this.getNextPieceType();
        this.nextPiece = { type: this.getNextPieceType(), rotation: 0 };
        
        const shapeDef = SHAPES[type];
        
        // Spawn logic: 
        // Rows 21/22 (index 18/19 in 0-39 bottom-up? No, usually top-down 0-39).
        // Let's use 0 as top (hidden) and 39 as bottom.
        // Visible area is 20-39.
        // Spawns at 18/19 (just above visible).
        
        // Center: 
        // Grid width 10. Center is 5.
        // Piece width 3 or 4. 
        // x = 3 for 4-wide (I), x = 3 for 3-wide (J,L,S,T,Z), x=4 for O?
        // Standard:
        // I: x=3, y=18 (flat side down)
        // O: x=4, y=18
        // Others: x=3, y=18
        
        let startX = 3;
        let startY = 18; // 2 rows above visible line (row 20)
        
        if (type === 'O') startX = 4;

        this.activePiece = {
            type: type,
            x: startX,
            y: startY,
            rotation: 0,
            shape: shapeDef.blocks
        };

        // Reset Lock
        this.manipulationCount = 0;
        this.resetLockTimer();

        // Immediate game over check: Collision on spawn
        if (this.checkCollision(this.activePiece.x, this.activePiece.y, this.activePiece.shape)) {
            this.gameOver = true;
        }

        // Apply "spawn gravity" - move down immediately if possible (Guideline)
        // Usually visual only, but logic wise we are at y=18. 
        // If row 19 is empty, it drops to 19? 
        // Guideline says: "appear... and move down immediately".
        // We'll let the first gravity tick handle it or force one drop.
        // For simplicity, let's start at the spawn coords.
        
        this.updateGhost();
    }

    rotate(dir) { // 1 for CW, -1 for CCW
        if (this.gameOver) return;
        if (this.activePiece.type === 'O') return; // O doesn't rotate

        const oldRotation = this.activePiece.rotation;
        const newRotation = (oldRotation + dir + 4) % 4; // 0-3
        
        const currentShape = this.activePiece.shape;
        const newShape = this.getRotatedShape(currentShape, dir);

        // SRS Wall Kicks
        const kickTable = this.activePiece.type === 'I' ? KICKS_I : KICKS_JLSTZ;
        const kickKey = `${oldRotation}-${newRotation}`;
        const kicks = kickTable[kickKey] || [[0,0]];

        for (let [dx, dy] of kicks) {
            // dy needs flip? SRS usually defines y-up. Our grid is y-down.
            // Standard SRS tables are: x right, y up.
            // Our grid: x right, y down.
            // So we must negate dy from the standard table.
            
            if (!this.checkCollision(this.activePiece.x + dx, this.activePiece.y - dy, newShape)) {
                this.activePiece.x += dx;
                this.activePiece.y -= dy;
                this.activePiece.rotation = newRotation;
                this.activePiece.shape = newShape;
                this.onMove();
                this.updateGhost();
                return;
            }
        }
    }

    getRotatedShape(matrix, dir) {
        // Matrix rotation
        const N = matrix.length;
        const newMatrix = Array.from({length: N}, () => Array(N).fill(0));
        
        for (let y = 0; y < N; y++) {
            for (let x = 0; x < N; x++) {
                if (dir === 1) { // CW
                    newMatrix[x][N - 1 - y] = matrix[y][x];
                } else { // CCW
                    newMatrix[N - 1 - x][y] = matrix[y][x];
                }
            }
        }
        return newMatrix;
    }

    move(dx, dy) {
        if (this.gameOver) return false;
        
        if (!this.checkCollision(this.activePiece.x + dx, this.activePiece.y + dy, this.activePiece.shape)) {
            this.activePiece.x += dx;
            this.activePiece.y += dy;
            
            if (dx !== 0) this.onMove();
            this.updateGhost();
            return true;
        }
        return false;
    }

    hardDrop() {
        if (this.gameOver) return;
        let dropped = 0;
        while (this.move(0, 1)) {
            dropped++;
            this.score += 2; // 2 points per cell hard dropped
        }
        this.lockPiece();
    }

    checkCollision(x, y, shape) {
        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (shape[r][c]) {
                    const boardX = x + c;
                    const boardY = y + r;

                    // Bounds
                    if (boardX < 0 || boardX >= this.COLS || boardY >= this.ROWS) return true;
                    
                    // Occupied (ignore negative Y, just off board top)
                    if (boardY >= 0 && this.board[boardY][boardX] !== 0) return true;
                }
            }
        }
        return false;
    }

    onMove() {
        // Extended Placement Lock Down
        if (this.lockTimer) {
            clearTimeout(this.lockTimer);
            this.lockTimer = null;
        }
        
        // If resting on something, restart timer (limit 15 moves)
        if (this.checkCollision(this.activePiece.x, this.activePiece.y + 1, this.activePiece.shape)) {
            if (this.manipulationCount < 15) {
                this.startLockTimer();
                this.manipulationCount++;
            } else {
                this.lockPiece();
            }
        }
    }

    startLockTimer() {
        if (!this.lockTimer) {
            this.lockTimer = setTimeout(() => {
                this.lockPiece();
            }, this.lockDelay);
        }
    }

    resetLockTimer() {
        if (this.lockTimer) clearTimeout(this.lockTimer);
        this.lockTimer = null;
    }

    update(time) {
        // Gravity is handled in main loop tick, but we can check lock here
        if (this.activePiece && this.checkCollision(this.activePiece.x, this.activePiece.y + 1, this.activePiece.shape)) {
            this.startLockTimer();
        }
    }

    lockPiece() {
        this.resetLockTimer();
        if (!this.activePiece) return;

        // Commit to board
        const { x, y, shape, type } = this.activePiece;
        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (shape[r][c]) {
                    const by = y + r;
                    // Game Over if locking above visible board (top 20 rows are buffer, 20 is start of visible)
                    // Actually buffer is 0-19. Visible 20-39.
                    // Top out: completely above visible.
                    
                    if (by < 0) continue; 
                    if (by < this.ROWS) {
                        this.board[by][x + c] = type;
                    }
                }
            }
        }

        // Check Top Out
        // If any block was placed in the buffer zone (rows 0-19) ??
        // Actually, loose guideline: "Block pushed above 20-row buffer".
        // Stricter: "Piece spawns overlapping".
        // We'll stick to: if we can't spawn, game over.
        
        this.clearLines();
        this.spawnPiece();
    }

    clearLines() {
        let linesCleared = 0;
        
        for (let y = this.ROWS - 1; y >= 0; y--) {
            if (this.board[y].every(cell => cell !== 0)) {
                this.board.splice(y, 1);
                this.board.unshift(Array(this.COLS).fill(0));
                linesCleared++;
                y++; // Recheck same row index
            }
        }

        if (linesCleared > 0) {
            this.lines += linesCleared;
            this.updateScore(linesCleared);
            // Level up every 10 lines
            this.level = Math.floor(this.lines / 10) + 1;
        }
    }

    updateScore(lines) {
        // Guideline scoring (Level * points)
        const points = [0, 100, 300, 500, 800]; // 1, 2, 3, 4 lines
        this.score += points[lines] * this.level;
    }

    updateGhost() {
        if (!this.ghostEnabled || this.gameOver) {
            this.ghostPiece = null;
            return;
        }

        let ghostY = this.activePiece.y;
        while (!this.checkCollision(this.activePiece.x, ghostY + 1, this.activePiece.shape)) {
            ghostY++;
        }

        this.ghostPiece = {
            ...this.activePiece,
            y: ghostY
        };
    }
}
