class Game {
    constructor(size = 19, overlineRule = false, threeRule = false) {
        this.size = size;
        this.overlineRule = overlineRule;
        this.threeRule = threeRule;
        this.board = []; // 0: empty, 1: black, 2: white
        this.currentPlayer = 1; // Black starts
        this.winner = null;
        this.moves = []; // History
        this.isGameOver = false;

        this.initBoard();
    }

    initBoard() {
        this.board = Array.from({ length: this.size }, () => Array(this.size).fill(0));
    }

    isValidMove(x, y) {
        if (x < 0 || x >= this.size || y < 0 || y >= this.size) return false;
        if (this.board[y][x] !== 0) return false;
        if (this.isGameOver) return false;

        // 3x3 Restriction for Black (Player 1)
        if (this.threeRule && this.currentPlayer === 1) {
            if (this.checkDoubleThree(x, y)) {
                return false;
            }
        }

        return true;
    }

    placeStone(x, y) {
        if (!this.isValidMove(x, y)) return false;

        this.board[y][x] = this.currentPlayer;
        this.moves.push({ x, y, player: this.currentPlayer });

        if (this.checkWin(x, y)) {
            this.winner = this.currentPlayer;
            this.isGameOver = true;
        } else if (this.moves.length === this.size * this.size) {
            this.isGameOver = true; // Draw
            this.winner = 0; // 0 means draw
        } else {
            this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
        }

        return true;
    }

    checkWin(x, y) {
        const player = this.board[y][x];
        const directions = [
            [1, 0],  // Horizontal
            [0, 1],  // Vertical
            [1, 1],  // Diagonal \
            [1, -1]  // Diagonal /
        ];

        for (let [dx, dy] of directions) {
            const count = this.countConsecutive(x, y, dx, dy, player);
            
            if (this.overlineRule) {
                // Strictly 5 stones
                if (count === 5) return true;
            } else {
                // 5 or more stones
                if (count >= 5) return true;
            }
        }
        return false;
    }

    countConsecutive(x, y, dx, dy, player) {
        let count = 1;
        
        // Check forward
        let i = 1;
        while (true) {
            const nx = x + dx * i;
            const ny = y + dy * i;
            if (nx < 0 || nx >= this.size || ny < 0 || ny >= this.size || this.board[ny][nx] !== player) break;
            count++;
            i++;
        }

        // Check backward
        i = 1;
        while (true) {
            const nx = x - dx * i;
            const ny = y - dy * i;
            if (nx < 0 || nx >= this.size || ny < 0 || ny >= this.size || this.board[ny][nx] !== player) break;
            count++;
            i++;
        }

        return count;
    }

    // Basic 3x3 check implementation
    checkDoubleThree(x, y) {
        // Temporarily place the stone
        this.board[y][x] = 1;
        
        const directions = [
            [1, 0], [0, 1], [1, 1], [1, -1]
        ];

        let openThreeCount = 0;

        for (let [dx, dy] of directions) {
            if (this.isOpenThree(x, y, dx, dy)) {
                openThreeCount++;
            }
        }

        // Undo placement
        this.board[y][x] = 0;

        return openThreeCount >= 2;
    }

    // Check if a line forms an "Open Three" (Live Three)
    // Pattern: .XXX. (Empty, Stone, Stone, Stone, Empty)
    isOpenThree(x, y, dx, dy) {
        // We need to look at the line formed by placing stone at x,y
        // We traverse outwards to find the extents of the continuous line of stones
        
        // 1. Find the start and end of the continuous block of stones including (x,y)
        let count = 1;
        let startDist = 0;
        let endDist = 0;

        // Look positive direction
        let i = 1;
        while (true) {
            const nx = x + dx * i;
            const ny = y + dy * i;
            if (nx < 0 || nx >= this.size || ny < 0 || ny >= this.size || this.board[ny][nx] !== 1) {
                // Check if the stopping point is empty (open)
                if (nx >= 0 && nx < this.size && ny >= 0 && ny < this.size && this.board[ny][nx] === 0) {
                   endDist = i; // Distance to the open end
                } else {
                   endDist = -1; // Blocked or edge
                }
                break;
            }
            count++;
            i++;
        }

        // Look negative direction
        i = 1;
        while (true) {
            const nx = x - dx * i;
            const ny = y - dy * i;
            if (nx < 0 || nx >= this.size || ny < 0 || ny >= this.size || this.board[ny][nx] !== 1) {
                if (nx >= 0 && nx < this.size && ny >= 0 && ny < this.size && this.board[ny][nx] === 0) {
                    startDist = i; // Distance to the open start
                } else {
                    startDist = -1; // Blocked
                }
                break;
            }
            count++;
            i++;
        }

        // Definition of Open Three: Exactly 3 stones, open on both sides
        // Note: Renju rules are complex and include "jumping threes" (X.XX), but simple "3x3" usually refers to .XXX.
        // We will stick to the contiguous definition for simplicity in this "simple webapp".
        
        if (count === 3 && startDist > 0 && endDist > 0) {
            // Further check: Is it TRULY open? 
            // Often strict rules require that the empty spaces on ends are not blocked immediately after.
            // But basic .XXX. detection is usually sufficient for casual play.
            return true;
        }

        return false;
    }
}
