// Colors
const COLORS = {
    I: '#00FFFF',
    J: '#0000FF',
    L: '#FFA500',
    O: '#FFFF00',
    S: '#008000',
    T: '#800080',
    Z: '#FF0000',
    GHOST: 'rgba(255, 255, 255, 0.2)'
};

// Tetromino Definitions (SRS)
// Shapes are defined as offsets from center. 
// O is 2x2, others are 3x3 or 4x4 (I).
// We'll use local coordinates.

const SHAPES = {
    I: {
        type: 'I',
        // 4x4 bounding box. Center is roughly (1.5, 1.5). 
        // 0: Flat
        blocks: [
            [0,0,0,0],
            [1,1,1,1],
            [0,0,0,0],
            [0,0,0,0]
        ],
        color: COLORS.I
    },
    J: {
        type: 'J',
        blocks: [
            [1,0,0],
            [1,1,1],
            [0,0,0]
        ],
        color: COLORS.J
    },
    L: {
        type: 'L',
        blocks: [
            [0,0,1],
            [1,1,1],
            [0,0,0]
        ],
        color: COLORS.L
    },
    O: {
        type: 'O',
        blocks: [
            [1,1],
            [1,1]
        ],
        color: COLORS.O
    },
    S: {
        type: 'S',
        blocks: [
            [0,1,1],
            [1,1,0],
            [0,0,0]
        ],
        color: COLORS.S
    },
    T: {
        type: 'T',
        blocks: [
            [0,1,0],
            [1,1,1],
            [0,0,0]
        ],
        color: COLORS.T
    },
    Z: {
        type: 'Z',
        blocks: [
            [1,1,0],
            [0,1,1],
            [0,0,0]
        ],
        color: COLORS.Z
    }
};

// Wall Kicks (SRS)
// Format: [test1, test2, test3, test4]
// Each test is [dx, dy]. 
// 0->1, 1->0, 1->2, 2->1, 2->3, 3->2, 3->0, 0->3

// JLSTZ Wall Kicks
const KICKS_JLSTZ = {
    '0-1': [[0,0], [-1,0], [-1,1], [0,-2], [-1,-2]],
    '1-0': [[0,0], [1,0], [1,-1], [0,2], [1,2]],
    '1-2': [[0,0], [1,0], [1,-1], [0,2], [1,2]],
    '2-1': [[0,0], [-1,0], [-1,1], [0,-2], [-1,-2]],
    '2-3': [[0,0], [1,0], [1,1], [0,-2], [1,-2]],
    '3-2': [[0,0], [-1,0], [-1,-1], [0,2], [-1,2]],
    '3-0': [[0,0], [-1,0], [-1,-1], [0,2], [-1,2]],
    '0-3': [[0,0], [1,0], [1,1], [0,-2], [1,-2]]
};

// I Wall Kicks
const KICKS_I = {
    '0-1': [[0,0], [-2,0], [1,0], [-2,-1], [1,2]],
    '1-0': [[0,0], [2,0], [-1,0], [2,1], [-1,-2]],
    '1-2': [[0,0], [-1,0], [2,0], [-1,2], [2,-1]],
    '2-1': [[0,0], [1,0], [-2,0], [1,-2], [-2,1]],
    '2-3': [[0,0], [2,0], [-1,0], [2,1], [-1,-2]],
    '3-2': [[0,0], [-2,0], [1,0], [-2,-1], [1,2]],
    '3-0': [[0,0], [1,0], [-2,0], [1,-2], [-2,1]],
    '0-3': [[0,0], [-1,0], [2,0], [-1,2], [2,-1]]
};

// O has no kicks (doesn't rotate)

const KEYS = {
    LEFT: 'ArrowLeft',
    RIGHT: 'ArrowRight',
    UP: 'ArrowUp', // Rotate CW
    DOWN: 'ArrowDown', // Soft Drop
    SPACE: 'Space', // Hard Drop
    Z: 'z', // Rotate CCW
    CTRL: 'Control' // Rotate CCW
};
