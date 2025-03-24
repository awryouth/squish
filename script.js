const BOARD_SIZE = 4;
let board = [];
let isAnimating = false;

// 1) Clone a 2D array
function copyBoard(sourceBoard) {
  return sourceBoard.map(row => row.slice());
}

// 2) Create an empty board (all zeros)
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

// 3) Spawn a tile with value 2 or 4
function spawnTile() {
  const emptyCells = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === 0) {
        emptyCells.push({ r, c });
      }
    }
  }
  if (emptyCells.length === 0) return;

  const { r, c } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
  board[r][c] = Math.random() < 0.9 ? 2 : 4;
}

// 4) Draw the board in final positions (no transitions)
function drawBoard() {
  const boardEl = document.getElementById("game-board");
  boardEl.innerHTML = "";

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const value = board[r][c];
      if (value !== 0) {
        const cellEl = document.createElement("div");
        cellEl.classList.add("cell");
        cellEl.style.left = `${c * 180}px`;
        cellEl.style.top = `${r * 180}px`;
        // Set tile's image
        cellEl.style.backgroundImage = `url("tiles/${value}.jpg")`;
        cellEl.style.backgroundSize = "cover";

        // Add a numeric overlay in bottom-right corner
        const tileValue = document.createElement("span");
        tileValue.classList.add("tile-value");
        tileValue.textContent = value;
        cellEl.appendChild(tileValue);

        boardEl.appendChild(cellEl);
      }
    }
  }
}

// 5) Move the board in a direction (merge logic), return true if changed
function moveBoard(direction) {
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

  let moved = false;
  for (let r = 0; r < BOARD_SIZE; r++) {
    const row = board[r];
    const { newRow, didChange } = collapseRowLeft(row);
    board[r] = newRow;
    if (didChange) moved = true;
  }

  if (reversed) {
    board = reverseRows(board);
  }
  if (transformed) {
    board = transpose(board);
  }

  if (moved) {
    spawnTile();
  }
  return moved;
}

// 6) Collapse row to the left with merges
function collapseRowLeft(row) {
  const filtered = row.filter(v => v !== 0);
  let didChange = filtered.length !== row.length;
  for (let i = 0; i < filtered.length - 1; i++) {
    if (filtered[i] === filtered[i + 1]) {
      filtered[i] *= 2;
      filtered.splice(i + 1, 1);
      didChange = true;
    }
  }
  while (filtered.length < row.length) {
    filtered.push(0);
  }
  return { newRow: filtered, didChange };
}

// 7) Transpose a 2D array
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

// 8) Reverse rows in a 2D array
function reverseRows(mat) {
  return mat.map(row => row.slice().reverse());
}

// 9) Check if the game is won or lost
function checkGameState() {
  // Check for 1024
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === 1024) {
        alert("You made the 1024 tile! (Keep going or restart?)");
        return;
      }
    }
  }
  // Check if no moves remain
  if (!anyMovesLeft()) {
    alert("Game Over! No moves left.");
  }
}

// 10) Check if any move is left
function anyMovesLeft() {
  // Check for an empty cell
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === 0) return true;
    }
  }
  // Check horizontal merges
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE - 1; c++) {
      if (board[r][c] === board[r][c + 1]) return true;
    }
  }
  // Check vertical merges
  for (let c = 0; c < BOARD_SIZE; c++) {
    for (let r = 0; r < BOARD_SIZE - 1; r++) {
      if (board[r][c] === board[r + 1][c]) return true;
    }
  }
  return false;
}

// 11) Animate from old board to new board
function animateSlide(oldBoard, newBoard) {
  const boardEl = document.getElementById("game-board");
  boardEl.innerHTML = "";  // Clear old tiles

  // Copy of oldBoard for matching tile values
  let oldCopy = copyBoard(oldBoard);
  let tilesAnimating = 0;

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const newVal = newBoard[r][c];
      if (newVal === 0) continue; // no tile

      // Find a match in oldCopy
      let foundOldPos = null;
      outerLoop:
      for (let rr = 0; rr < BOARD_SIZE; rr++) {
        for (let cc = 0; cc < BOARD_SIZE; cc++) {
          if (oldCopy[rr][cc] === newVal) {
            foundOldPos = { r: rr, c: cc };
            oldCopy[rr][cc] = 0; // Mark used
            break outerLoop;
          }
        }
      }

      // If no match found, treat it as "new" tile
      const startR = foundOldPos ? foundOldPos.r : r;
      const startC = foundOldPos ? foundOldPos.c : c;

      // Create a temp tile
      const tempTile = document.createElement("div");
      tempTile.classList.add("cell");
      tempTile.style.backgroundImage = `url("tiles/${newVal}.jpg")`;
      tempTile.style.backgroundSize = "cover";
      // Start at old pos
      tempTile.style.left = `${startC * 180}px`;
      tempTile.style.top = `${startR * 180}px`;

      // Add numeric overlay
      const tileValue = document.createElement("span");
      tileValue.classList.add("tile-value");
      tileValue.textContent = newVal;
      tempTile.appendChild(tileValue);

      boardEl.appendChild(tempTile);

      // Force reflow
      tempTile.getBoundingClientRect();

      // Slide to new pos
      tilesAnimating++;
      tempTile.addEventListener("transitionend", () => {
        tilesAnimating--;
        if (tilesAnimating === 0) {
          // All slides done, clear temp tiles, draw final
          boardEl.innerHTML = "";
          drawBoard();
          checkGameState();
          isAnimating = false;
        }
      });

      // Animate in next frame
      requestAnimationFrame(() => {
        tempTile.style.left = `${c * 180}px`;
        tempTile.style.top = `${r * 180}px`;
      });
    }
  }
  // If nothing is animating at all
  if (tilesAnimating === 0) {
    boardEl.innerHTML = "";
    drawBoard();
    checkGameState();
    isAnimating = false;
  }
}

// 12) Handle a single move
function handleMove(direction) {
  if (isAnimating) return; // skip if in middle of animation
  const oldBoard = copyBoard(board);

  const changed = moveBoard(direction);
  if (!changed) return; // no movement -> no animation

  isAnimating = true;
  animateSlide(oldBoard, board);
}

// 13) Key listener
function handleKey(e) {
  switch (e.key) {
    case "ArrowLeft":
      e.preventDefault();
      handleMove("left");
      break;
    case "ArrowRight":
      e.preventDefault();
      handleMove("right");
      break;
    case "ArrowUp":
      e.preventDefault();
      handleMove("up");
      break;
    case "ArrowDown":
      e.preventDefault();
      handleMove("down");
      break;
    default:
      return;
  }
}

// 14) Init game
function initGame() {
  createEmptyBoard();
  spawnTile();
  spawnTile();
  drawBoard();
}

// 15) On page load
window.addEventListener("load", () => {
  initGame();

  window.addEventListener("keydown", handleKey);

  const newGameBtn = document.getElementById("new-game-btn");
  newGameBtn.addEventListener("click", () => {
    initGame();
  });
});
