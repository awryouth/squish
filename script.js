const BOARD_SIZE = 4;
let board = [];

/**
 * Creates the initial empty board array of size 4x4 (adjust if needed).
 */
function createEmptyBoard() {
  board = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    const row = [];
    for (let c = 0; c < BOARD_SIZE; c++) {
      row.push(0);
    }
    board.push(row);
  }
}

/**
 * Spawns a new tile (value = 2 or 4) in a random empty spot.
 */
function spawnTile() {
  const emptyCells = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === 0) {
        emptyCells.push({ r, c });
      }
    }
  }

  if (emptyCells.length === 0) {
    return; // No empty cells, can't spawn
  }

  const randomIndex = Math.floor(Math.random() * emptyCells.length);
  const cell = emptyCells[randomIndex];
  // 90% chance for '2', 10% for '4'
  board[cell.r][cell.c] = Math.random() < 0.9 ? 2 : 4;
}

/**
 * Renders the board to the DOM by creating .cell elements
 * with background images for each nonzero tile.
 */
function drawBoard() {
  const boardEl = document.getElementById("game-board");
  boardEl.innerHTML = "";

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const value = board[r][c];
      if (value !== 0) {
        const cellEl = document.createElement("div");
        cellEl.classList.add("cell");
        cellEl.style.left = `${c * 90}px`;
        cellEl.style.top = `${r * 90}px`;

        // If you have an image for this tile, set it as background
        cellEl.style.backgroundImage = `url("tiles/${value}.jpg")`;
        cellEl.style.backgroundSize = "cover";

        boardEl.appendChild(cellEl);
      } else {
        // Optionally draw "empty" cells for debugging:
        const emptyCellEl = document.createElement("div");
        emptyCellEl.classList.add("cell");
        emptyCellEl.style.left = `${c * 90}px`;
        emptyCellEl.style.top = `${r * 90}px`;
        emptyCellEl.style.opacity = "0.3";
        boardEl.appendChild(emptyCellEl);
      }
    }
  }
}

/**
 * Moves all rows or columns in the direction indicated.
 * - direction is one of 'left', 'right', 'up', 'down'.
 * This function modifies the board in place.
 */
function moveBoard(direction) {
  // Step 1: Transform the board as needed to make 'left' the only logic we handle
  // For example, for 'right', reverse each row; for 'up', transpose; etc.
  let transformed = false;
  let reversed = false;
  if (direction === "up" || direction === "down") {
    board = transpose(board);
    transformed = true;
  }
  if (direction === "right" || direction === "down") {
    board = reverseRows(board);
    reversed = true;
  }

  // Step 2: Move left on each row
  let moved = false;
  for (let r = 0; r < BOARD_SIZE; r++) {
    const row = board[r];
    const { newRow, didChange } = collapseRowLeft(row);
    board[r] = newRow;
    if (didChange) moved = true;
  }

  // Step 3: Reverse transform to get board back in normal orientation
  if (reversed) {
    board = reverseRows(board);
  }
  if (transformed) {
    board = transpose(board);
  }

  // Step 4: If something moved, spawn a new tile
  if (moved) {
    spawnTile();
  }
}

/**
 * Collapse a single row to the left. 
 * Combining equal adjacent tiles into one tile (sum of both).
 */
function collapseRowLeft(row) {
  // Filter out zeros to get all tile values in front
  const filtered = row.filter((v) => v !== 0);
  let didChange = filtered.length !== row.length;
  // Combine adjacent tiles
  for (let i = 0; i < filtered.length - 1; i++) {
    if (filtered[i] === filtered[i + 1]) {
      filtered[i] *= 2;        // double current
      filtered.splice(i + 1, 1); // remove combined tile
      didChange = true;
    }
  }
  // Pad row back to length
  while (filtered.length < row.length) {
    filtered.push(0);
  }
  return { newRow: filtered, didChange };
}

/**
 * Transpose a 2D matrix (rows -> columns).
 */
function transpose(mat) {
  const transposed = [];
  for (let c = 0; c < BOARD_SIZE; c++) {
    const newRow = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
      newRow.push(mat[r][c]);
    }
    transposed.push(newRow);
  }
  return transposed;
}

/**
 * Reverse each row of a 2D matrix (used for 'right' moves, etc.).
 */
function reverseRows(mat) {
  return mat.map(row => row.slice().reverse());
}

/**
 * Checks if the board has any moves left or if any tile is 1024 (win condition).
 */
function checkGameState() {
  // Check if any tile is 1024
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === 1024) {
        alert("You got 1024!)");
        return;
      }
    }
  }

  // Check if any move is possible
  if (!anyMovesLeft()) {
    alert("Game Over!");
  }
}

/**
 * Checks if any move is possible (mergeable neighbors or empty cells).
 */
function anyMovesLeft() {
  // Check for empty cell
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === 0) return true;
    }
  }
  // Check for adjacent merges horizontally
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE - 1; c++) {
      if (board[r][c] === board[r][c + 1]) return true;
    }
  }
  // Check for adjacent merges vertically
  for (let c = 0; c < BOARD_SIZE; c++) {
    for (let r = 0; r < BOARD_SIZE - 1; r++) {
      if (board[r][c] === board[r + 1][c]) return true;
    }
  }
  return false;
}

function handleKey(e) {
  switch (e.key) {
    case "ArrowLeft":
      e.preventDefault();
      moveBoard("left");
      break;
    case "ArrowRight":
      e.preventDefault();
      moveBoard("right");
      break;
    case "ArrowUp":
      e.preventDefault();
      moveBoard("up");
      break;
    case "ArrowDown":
      e.preventDefault();
      moveBoard("down");
      break;
    default:
      return;
  }
  drawBoard();
  checkGameState();
}

/**
 * Initializes the board, spawns two tiles, draws for the first time.
 */
function initGame() {
  createEmptyBoard();
  spawnTile();
  spawnTile();
  drawBoard();
}

/**
 * On page load, set up key listeners and new game button.
 */
window.addEventListener("load", () => {
  // Start a new game
  initGame();
  
  // Listen for arrow keys
  window.addEventListener("keydown", handleKey);

  // 'New Game' button
  const newGameBtn = document.getElementById("new-game-btn");
  newGameBtn.addEventListener("click", () => {
    initGame();
  });
});
