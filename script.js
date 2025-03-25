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

// 4) Compute the top/left in % for a given row/col in a BOARD_SIZE x BOARD_SIZE
function getOffsetPercent(index) {
  return (index * 100) / BOARD_SIZE; // e.g. for col=1 in a 4-wide board => 25%
}

// 5) Compute width or height for a single tile in % (here: 100% / 4 = 25%)
function getTileSizePercent() {
  return 100 / BOARD_SIZE;
}

// 6) Draw the board in final positions (no transitions)
function drawBoard() {
  const boardEl = document.getElementById("game-board");
  boardEl.innerHTML = "";

  const tileSize = getTileSizePercent();

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const value = board[r][c];
      if (value !== 0) {
        const cellEl = document.createElement("div");
        cellEl.classList.add("cell");
        // Position in percentages
        cellEl.style.left = getOffsetPercent(c) + "%";
        cellEl.style.top = getOffsetPercent(r) + "%";
        cellEl.style.width = tileSize + "%";
        cellEl.style.height = tileSize + "%";

        // Use the .jpg in the tiles/ folder
        cellEl.style.backgroundImage = `url("tiles/${value}.jpg")`;
        cellEl.style.backgroundSize = "cover";

        // Numeric label in bottom-right
        const tileValue = document.createElement("span");
        tileValue.classList.add("tile-value");
        tileValue.textContent = value;
        cellEl.appendChild(tileValue);

        boardEl.appendChild(cellEl);
      }
    }
  }
}

// 7) Move the board in a direction (merge logic), return true if changed
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

// 8) Collapse row to the left with merges
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

// 9) Transpose a 2D array
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

// 10) Reverse rows in a 2D array
function reverseRows(mat) {
  return mat.map(row => row.slice().reverse());
}

// 11) Check if the game is won or lost
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

// 12) Check if any move is left
function anyMovesLeft() {
  // Check for empty cell
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === 0) return true;
    }
  }
  // Check merges horizontally
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE - 1; c++) {
      if (board[r][c] === board[r][c + 1]) return true;
    }
  }
  // Check merges vertically
  for (let c = 0; c < BOARD_SIZE; c++) {
    for (let r = 0; r < BOARD_SIZE - 1; r++) {
      if (board[r][c] === board[r + 1][c]) return true;
    }
  }
  return false;
}

// 13) Animate from old board to new board (slide in percentages)
function animateSlide(oldBoard, newBoard) {
  const boardEl = document.getElementById("game-board");
  boardEl.innerHTML = "";  // Clear old tiles

  const oldCopy = copyBoard(oldBoard);
  const tileSize = getTileSizePercent();
  let tilesAnimating = 0;

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const newVal = newBoard[r][c];
      if (newVal === 0) continue;

      // Try to find an old tile with the same value
      let foundOldPos = null;
      outerLoop:
      for (let rr = 0; rr < BOARD_SIZE; rr++) {
        for (let cc = 0; cc < BOARD_SIZE; cc++) {
          if (oldCopy[rr][cc] === newVal) {
            foundOldPos = { r: rr, c: cc };
            oldCopy[rr][cc] = 0; // mark used
            break outerLoop;
          }
        }
      }

      // If no match found, treat as newly spawned
      const startR = foundOldPos ? foundOldPos.r : r;
      const startC = foundOldPos ? foundOldPos.c : c;

      // Create a temp tile at old position
      const tempTile = document.createElement("div");
      tempTile.classList.add("cell");
      tempTile.style.backgroundImage = `url("tiles/${newVal}.jpg")`;
      tempTile.style.backgroundSize = "cover";

      // Start in old pos (in %)
      tempTile.style.left = getOffsetPercent(startC) + "%";
      tempTile.style.top = getOffsetPercent(startR) + "%";
      tempTile.style.width = tileSize + "%";
      tempTile.style.height = tileSize + "%";

      // Numeric label
      const tileValue = document.createElement("span");
      tileValue.classList.add("tile-value");
      tileValue.textContent = newVal;
      tempTile.appendChild(tileValue);

      boardEl.appendChild(tempTile);

      // Force reflow
      tempTile.getBoundingClientRect();

      // Slide to new position
      tilesAnimating++;
      tempTile.addEventListener("transitionend", () => {
        tilesAnimating--;
        if (tilesAnimating === 0) {
          boardEl.innerHTML = "";
          drawBoard();
          checkGameState();
          isAnimating = false;
        }
      });

      // Animate in next frame
      requestAnimationFrame(() => {
        tempTile.style.left = getOffsetPercent(c) + "%";
        tempTile.style.top = getOffsetPercent(r) + "%";
      });
    }
  }

  // If no tiles animate at all, finalize immediately
  if (tilesAnimating === 0) {
    boardEl.innerHTML = "";
    drawBoard();
    checkGameState();
    isAnimating = false;
  }
}

// 14) Handle a single move
function handleMove(direction) {
  if (isAnimating) return; // skip if in the middle of an animation
  const oldBoard = copyBoard(board);

  const changed = moveBoard(direction);
  if (!changed) return; // no movement => no animation

  isAnimating = true;
  animateSlide(oldBoard, board);
}

// 15) Key listener
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

// 16) Init game
function initGame() {
  createEmptyBoard();
  spawnTile();
  spawnTile();
  drawBoard();
}

// 17) On page load
window.addEventListener("load", () => {
  initGame();

  window.addEventListener("keydown", handleKey);

  const newGameBtn = document.getElementById("new-game-btn");
  newGameBtn.addEventListener("click", () => {
    initGame();
  });
});
