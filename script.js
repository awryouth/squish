const BOARD_SIZE = 4;
let board = [];
let isAnimating = false;

/**
 * Returns a copy of the given 2D board array.
 */
function copyBoard(sourceBoard) {
  console.log("copyBoard() called");
  return sourceBoard.map(row => row.slice());
}

/**
 * Creates a BOARD_SIZE x BOARD_SIZE array initialized to 0.
 */
function createEmptyBoard() {
  console.log("createEmptyBoard() called");
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
 * Spawns a new tile (2 or 4) in a random empty cell.
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
  console.log("spawnTile(): Found", emptyCells.length, "empty cells");

  if (emptyCells.length === 0) {
    console.log("spawnTile(): No empty cells, cannot spawn");
    return;
  }

  const randomIndex = Math.floor(Math.random() * emptyCells.length);
  const { r, c } = emptyCells[randomIndex];
  const newValue = Math.random() < 0.9 ? 2 : 4;
  board[r][c] = newValue;

  console.log(`spawnTile(): Spawned a ${newValue} at row=${r}, col=${c}`);
}

/**
 * Calculates the top/left offset (in %) for a given row or col index.
 */
function getOffsetPercent(index) {
  // e.g. in a 4×4 board, each tile is 25%
  return (index * 100) / BOARD_SIZE;
}

/**
 * Calculates the tile size (in %) for a BOARD_SIZE x BOARD_SIZE grid.
 */
function getTileSizePercent() {
  // e.g. for BOARD_SIZE=4 => 25%
  return 100 / BOARD_SIZE;
}

/**
 * Renders the board's final state (no animations).
 */
function drawBoard() {
  console.log("drawBoard(): Updating DOM for the final board state");
  const boardEl = document.getElementById("game-board");
  boardEl.innerHTML = "";

  const tileSize = getTileSizePercent();

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const value = board[r][c];
      if (value !== 0) {
        const cellEl = document.createElement("div");
        cellEl.classList.add("cell");

        // Position & size in percentages
        cellEl.style.left = getOffsetPercent(c) + "%";
        cellEl.style.top = getOffsetPercent(r) + "%";
        cellEl.style.width = tileSize + "%";
        cellEl.style.height = tileSize + "%";

        // Use tile image from tiles/{value}.jpg
        cellEl.style.backgroundImage = `url("tiles/${value}.jpg")`;
        cellEl.style.backgroundSize = "cover";

        // Numeric overlay
        const tileValue = document.createElement("span");
        tileValue.classList.add("tile-value");
        tileValue.textContent = value;
        cellEl.appendChild(tileValue);

        boardEl.appendChild(cellEl);
      }
    }
  }
}

/**
 * Moves the board in a direction ("left","right","up","down"), merges tiles, and spawns a new tile if changed.
 * Returns true if the board changed, false if no move was made.
 */
function moveBoard(direction) {
  console.log(`moveBoard() called with direction: ${direction}`);
  let transformed = false;
  let reversed = false;

  // If moving up/down, transpose the board so we can handle it like left/right
  if (direction === "up" || direction === "down") {
    console.log("moveBoard(): Transposing board for up/down");
    board = transpose(board);
    transformed = true;
  }
  // If moving right/down, reverse each row so we can handle it like "left"
  if (direction === "right" || direction === "down") {
    console.log("moveBoard(): Reversing rows for right/down");
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

  // Reverse the transformations
  if (reversed) {
    console.log("moveBoard(): Re-reversing rows to restore orientation");
    board = reverseRows(board);
  }
  if (transformed) {
    console.log("moveBoard(): Re-transposing board to restore orientation");
    board = transpose(board);
  }

  if (moved) {
    console.log("moveBoard(): Board changed, spawning new tile");
    spawnTile();
  } else {
    console.log("moveBoard(): No tiles moved, no new tile spawned");
  }

  return moved;
}

/**
 * Slides/merges a single row to the left. Returns the new row and whether it changed.
 */
function collapseRowLeft(row) {
  const filtered = row.filter(v => v !== 0);
  let didChange = filtered.length !== row.length;

  for (let i = 0; i < filtered.length - 1; i++) {
    if (filtered[i] === filtered[i + 1]) {
      console.log(`collapseRowLeft(): merging ${filtered[i]} and ${filtered[i + 1]}`);
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

/**
 * Transposes a 2D array (rows become columns).
 */
function transpose(mat) {
  console.log("transpose() called");
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
 * Reverses each row of a 2D array (used for right/down moves).
 */
function reverseRows(mat) {
  console.log("reverseRows() called");
  return mat.map(row => row.slice().reverse());
}

/**
 * Checks if the board has a 1024 tile (win) or if no moves remain (loss).
 */
function checkGameState() {
  console.log("checkGameState() called");
  // Check for 1024
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === 1024) {
        console.log("checkGameState(): 1024 tile found, player wins!");
        alert("You made the 1024 tile! (Keep going or restart?)");
        return;
      }
    }
  }
  // Check if any moves remain
  if (!anyMovesLeft()) {
    console.log("checkGameState(): No moves left, game over");
    alert("Game Over! No moves left.");
  }
}

/**
 * Determines if there is any possible move remaining (empty cell or merge).
 */
function anyMovesLeft() {
  console.log("anyMovesLeft() called");
  // Check for an empty cell
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === 0) {
        console.log("anyMovesLeft(): Found an empty cell at", r, c);
        return true;
      }
    }
  }
  // Check horizontal merges
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE - 1; c++) {
      if (board[r][c] === board[r][c + 1]) {
        console.log("anyMovesLeft(): Found a horizontal merge possibility at", r, c);
        return true;
      }
    }
  }
  // Check vertical merges
  for (let c = 0; c < BOARD_SIZE; c++) {
    for (let r = 0; r < BOARD_SIZE - 1; r++) {
      if (board[r][c] === board[r + 1][c]) {
        console.log("anyMovesLeft(): Found a vertical merge possibility at", r, c);
        return true;
      }
    }
  }
  return false;
}

/**
 * Animates tiles from oldBoard to newBoard by sliding them in percentages.
 * When transitions end, finalizes the board with drawBoard() and checks state.
 */
function animateSlide(oldBoard, newBoard) {
  console.log("animateSlide() called");
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

      // If no match found, treat as newly spawned tile
      const startR = foundOldPos ? foundOldPos.r : r;
      const startC = foundOldPos ? foundOldPos.c : c;
      console.log(`animateSlide(): tile ${newVal} moves from (${startR},${startC}) to (${r},${c})`);

      // Create a temp tile at the old position
      const tempTile = document.createElement("div");
      tempTile.classList.add("cell");

      // Use tile image
      tempTile.style.backgroundImage = `url("tiles/${newVal}.jpg")`;
      tempTile.style.backgroundSize = "cover";

      // Start in old pos
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

      // Force reflow so the initial positions are set
      tempTile.getBoundingClientRect();

      // Slide to new position
      tilesAnimating++;
      tempTile.addEventListener("transitionend", () => {
        tilesAnimating--;
        console.log(`animateSlide(): tile ${newVal} finished transition`);
        if (tilesAnimating === 0) {
          console.log("animateSlide(): All transitions complete, finalizing board");
          boardEl.innerHTML = "";
          drawBoard();
          checkGameState();
          isAnimating = false;
        }
      });

      // Animate in the next frame
      requestAnimationFrame(() => {
        tempTile.style.left = getOffsetPercent(c) + "%";
        tempTile.style.top = getOffsetPercent(r) + "%";
      });
    }
  }

  // If no tiles animate, finalize immediately
  if (tilesAnimating === 0) {
    console.log("animateSlide(): No tiles animating, finalizing immediately");
    boardEl.innerHTML = "";
    drawBoard();
    checkGameState();
    isAnimating = false;
  }
}

/**
 * Wrapper to handle a single move (arrow left/right/up/down).
 */
function handleMove(direction) {
  if (isAnimating) {
    console.log("handleMove(): Ignoring move, animation in progress");
    return;
  }
  console.log("handleMove(): Attempting move ->", direction);

  const oldBoard = copyBoard(board);
  const changed = moveBoard(direction);

  if (!changed) {
    console.log("handleMove(): Move did not change the board, nothing to animate");
    return;
  }

  isAnimating = true;
  animateSlide(oldBoard, board);
}

/**
 * Key listener for arrow keys.
 */
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

/**
 * Initializes a fresh game: empty board, spawn two tiles, draw once.
 */
function initGame() {
  console.log("initGame(): Starting new game");
  createEmptyBoard();
  spawnTile();
  spawnTile();
  drawBoard();
}

/**
 * On page load, set up everything.
 */
window.addEventListener("load", () => {
  console.log("window.load event: Initializing game");
  initGame();

  window.addEventListener("keydown", handleKey);

  const newGameBtn = document.getElementById("new-game-btn");
  newGameBtn.addEventListener("click", () => {
    console.log("New Game button clicked");
    initGame();
  });
});
