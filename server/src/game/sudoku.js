"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SudokuEngine = void 0;
class SudokuEngine {
    static generate(difficulty) {
        const solution = this.generateSolvedBoard();
        const board = this.pokeHoles(JSON.parse(JSON.stringify(solution)), difficulty);
        return { board, solution };
    }
    static generateSolvedBoard() {
        const board = Array(9).fill(null).map(() => Array(9).fill(0));
        this.fillBoard(board);
        return board;
    }
    static fillBoard(board) {
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (board[row][col] === 0) {
                    const nums = this.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
                    for (const num of nums) {
                        if (this.isValid(board, row, col, num)) {
                            board[row][col] = num;
                            if (this.fillBoard(board))
                                return true;
                            board[row][col] = 0;
                        }
                    }
                    return false;
                }
            }
        }
        return true;
    }
    static isValid(board, row, col, num) {
        for (let i = 0; i < 9; i++) {
            if (board[row][i] === num || board[i][col] === num)
                return false;
        }
        const startRow = Math.floor(row / 3) * 3;
        const startCol = Math.floor(col / 3) * 3;
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if (board[startRow + i][startCol + j] === num)
                    return false;
            }
        }
        return true;
    }
    static shuffle(array) {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    }
    static pokeHoles(board, difficulty) {
        const holes = {
            easy: 35,
            medium: 45,
            hard: 55,
        }[difficulty];
        let removed = 0;
        while (removed < holes) {
            const row = Math.floor(Math.random() * 9);
            const col = Math.floor(Math.random() * 9);
            if (board[row][col] !== 0) {
                board[row][col] = 0;
                removed++;
            }
        }
        return board;
    }
}
exports.SudokuEngine = SudokuEngine;
