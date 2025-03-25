/**************************************
 * 1024 Game with Unique-ID Tiles
 **************************************/

const BOARD_SIZE = 4;
let board = [];         // 2D array: board[r][c] = { id, value } or null
let isAnimating = false;
let nextTileId = 1;     // global unique ID generator

/**
 * Creates and returns a new tile object: { id, value }.
 */
function createTile(value) {
  return {
    id: nextTileId++,
    value
  };
}

/**
 * Create an empty 2D board (all null).
 */
function createEmptyBoard() {
  console.log("createEmptyBoard() called");
  board = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    const row = [];
    for (let c = 0; c < BOARD_SIZE; c++) {
      row.push(null);
    }
    board.push(row);
  }
}

/**
 * Spawn a new tile (value=2 or 4) in a random empty spot.
 */
function spawnTile() {
  const emptyCells = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === null) {
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

  board[r][c] = createTile(newValue);
  console.log(`spawnTile(): Spawned tile {id:${board[r][c].id}, value:${newValue}} at [${r},${c}]`);
}

/**
 * Key listener for arrow keys. Translates them to moves.
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
 * High-level move function. Takes direction => merges => spawns => animates.
 */
function handleMove(direction) {
  if (isAnimating) {
    console.log("handleMove(): Ignoring move, animation in progress");
    return;
  }

  console.log("handleMove(): Attempting move ->", direction);
  const oldBoard = copyBoard(board); // snapshot

  const changed = moveBoard(direction);
  if (!changed) {
    console.log("handleMove(): Move did not change the board, nothing to animate");
    return;
  }

  isAnimating = true;
  animateSlide(oldBoard, board);
}

/**
 * Actually merges/moves the board for the given direction:
 * 'left', 'right', 'up', 'down'.
 * Returns true if any tile changed position/value, false otherwise.
 */
function moveBoard(direction) {
  console.log(`moveBoard() called with direction: ${direction}`);
  let transformed = false;
  let reversed = false;

  // Up or Down => transpose
  if (direction === "up" || direction === "down") {
    board = transpose(board);
    transformed = true;
    console.log("moveBoard(): Transposed for up/down");
  }
  // Right or Down => reverse each row
  if (direction === "right" || direction === "down") {
    board = reverseRows(board);
    reversed = true;
    console.log("moveBoard(): Reversed rows for right/down");
  }

  let moved = false;
  for (let r = 0; r < BOARD_SIZE; r++) {
    const { newRow, didChange } = collapseRowLeft(board[r]);
    board[r] = newRow;
    if (didChange) moved = true;
  }

  // Undo transformations
  if (reversed) {
    board = reverseRows(board);
    console.log("moveBoard(): Re-reversed rows to restore orientation");
  }
  if (transformed) {
    board = transpose(board);
    console.log("moveBoard(): Re-transposed to restore orientation");
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
 * Slide/merge one row to the left in place.
 * Row is an array of tile objects or null, length=BOARD_SIZE.
 * Return { newRow, didChange }.
 */
function collapseRowLeft(row) {
  const filtered = row.filter(tile => tile !== null);
  let didChange = (filtered.length !== row.length);

  // Merge adjacent equal-value tiles
  for (let i = 0; i < filtered.length - 1; i++) {
    const curr = filtered[i];
    const next = filtered[i + 1];
    if (curr.value === next.value) {
      // Merge next into curr
      curr.value += next.value;  // Keep curr.id, curr.value
      filtered[i + 1] = null;    // remove next tile
      didChange = true;
      console.log(`collapseRowLeft(): Merging tile [id:${next.id}] into [id:${curr.id}], newValue=${curr.value}`);
      i++; // skip the next tile
    }
  }

  // Filter out null merges
  const merged = filtered.filter(tile => tile !== null);

  // Pad with null
  while (merged.length < row.length) {
    merged.push(null);
  }

  // If final arrangement differs from input
  for (let j = 0; j < row.length; j++) {
    if (row[j] !== merged[j]) {
      didChange = true;
      break;
    }
  }
  return { newRow: merged, didChange };
}

/**
 * Animate from oldBoard to newBoard by matching tile IDs.
 * If tile ID is in both boards, we move it from old -> new.
 * If tile is new, we treat it as spawned at new location.
 * If tile doesn't exist in new, it disappeared (merged).
 */
function animateSlide(oldBoard, newBoard) {
  console.log("animateSlide() called");
  const boardEl = document.getElementById("game-board");
  boardEl.innerHTML = "";

  let tilesAnimating = 0;
  const oldPositions = {};  // tileId => {r,c}

  // Gather old positions
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const oldTile = oldBoard[r][c];
      if (oldTile) {
        oldPositions[oldTile.id] = { r, c };
      }
    }
  }

  const tileSize = getTileSizePercent();

  // For each tile in newBoard, see if it existed previously
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const newTile = newBoard[r][c];
      if (!newTile) continue;

      const oldPos = oldPositions[newTile.id];
      let startR = r;
      let startC = c;

      if (oldPos) {
        startR = oldPos.r;
        startC = oldPos.c;
      }

      console.log(
        `animateSlide(): tile [id:${newTile.id}, val:${newTile.value}] from (${startR},${startC}) to (${r},${c})`
      );

      // Create a temp tile in old position
      const tempTile = document.createElement("div");
      tempTile.classList.add("cell");
      tempTile.style.backgroundImage = `url("tiles/${newTile.value}.jpg")`;
      tempTile.style.backgroundSize = "cover";

      // Numeric label
      const tileValue = document.createElement("span");
      tileValue.classList.add("tile-value");
      tileValue.textContent = newTile.value;
      tempTile.appendChild(tileValue);

      // Start at old coords
      tempTile.style.width = tileSize + "%";
      tempTile.style.height = tileSize + "%";
      tempTile.style.left = getOffsetPercent(startC) + "%";
      tempTile.style.top = getOffsetPercent(startR) + "%";

      boardEl.appendChild(tempTile);

      // Force reflow
      tempTile.getBoundingClientRect();

      // If the tile actually moved
      if (startR !== r || startC !== c) {
        tilesAnimating++;
        tempTile.addEventListener("transitionend", () => {
          tilesAnimating--;
          if (tilesAnimating === 0) {
            finalizeAnimation(boardEl);
          }
        });

        requestAnimationFrame(() => {
          tempTile.style.left = getOffsetPercent(c) + "%";
          tempTile.style.top = getOffsetPercent(r) + "%";
        });
      }
      // If same spot => no movement => no transition
    }
  }

  // If no tiles animate, finalize immediately
  if (tilesAnimating === 0) {
    console.log("animateSlide(): No tiles animating, finalize immediately");
    finalizeAnimation(boardEl);
  }
}

/**
 * Called after all animations finish or if none started.
 * Clears temp tiles, draws final board, checks game state, unblocks new moves.
 */
function finalizeAnimation(boardEl) {
  boardEl.innerHTML = "";
  drawBoard();           // draw final board
  checkGameState();
  isAnimating = false;
}

/**
 * Creates a deep clone of a board of tile objects.
 */
function copyBoard(sourceBoard) {
  console.log("copyBoard() called");
  const newBoard = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    const row = [];
    for (let c = 0; c < BOARD_SIZE; c++) {
      const oldTile = sourceBoard[r][c];
      if (oldTile) {
        // clone the tile object
        row.push({ id: oldTile.id, value: oldTile.value });
      } else {
        row.push(null);
      }
    }
    newBoard.push(row);
  }
  return newBoard;
}

/**
 * Reverse each row (for 'right' or 'down' moves).
 */
function reverseRows(mat) {
  console.log("reverseRows() called");
  return mat.map(row => row.slice().reverse());
}

/**
 * Transpose the board (for 'up' or 'down' moves).
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
 * Renders the board's final state (no animation).
 */
function drawBoard() {
  console.log("drawBoard(): Updating DOM for final board state");
  const boardEl = document.getElementById("game-board");
  boardEl.innerHTML = "";

  const tileSize = getTileSizePercent();

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const tile = board[r][c];
      if (tile) {
        const cellEl = document.createElement("div");
        cellEl.classList.add("cell");

        // Position & size in percentages
        cellEl.style.left = getOffsetPercent(c) + "%";
        cellEl.style.top = getOffsetPercent(r) + "%";
        cellEl.style.width = tileSize + "%";
        cellEl.style.height = tileSize + "%";

        // Use tile image from tiles/{value}.jpg
        cellEl.style.backgroundImage = `url("tiles/${tile.value}.jpg")`;
        cellEl.style.backgroundSize = "cover";

        // Numeric overlay
        const tileValue = document.createElement("span");
        tileValue.classList.add("tile-value");
        tileValue.textContent = tile.value;
        cellEl.appendChild(tileValue);

        boardEl.appendChild(cellEl);
      }
    }
  }
}

/**
 * Check if the player won or if the board is stuck (game over).
 */
function checkGameState() {
  console.log("checkGameState() called");
  // Check 1024
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const tile = board[r][c];
      if (tile && tile.value === 1024) {
        console.log("checkGameState(): found 1024 tile, game won!");
        alert("You made the 1024 tile! (Keep going or restart?)");
        return;
      }
    }
  }
  // Check any moves left
  if (!anyMovesLeft()) {
    console.log("checkGameState(): No moves left, game over");
    alert("Game Over! No moves left.");
  }
}

/**
 * True if there's an empty cell or any adjacent merge possible.
 */
function anyMovesLeft() {
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === null) {
        return true;
      }
    }
  }
  // Horizontal merges
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE - 1; c++) {
      const curr = board[r][c], next = board[r][c + 1];
      if (curr && next && curr.value === next.value) {
        return true;
      }
    }
  }
  // Vertical merges
  for (let c = 0; c < BOARD_SIZE; c++) {
    for (let r = 0; r < BOARD_SIZE - 1; r++) {
      const curr = board[r][c], below = board[r + 1][c];
      if (curr && below && curr.value === below.value) {
        return true;
      }
    }
  }
  return false;
}

/** 
 * Given a grid index, returns offset in % (like 25% in a 4×4).
 */
function getOffsetPercent(index) {
  return (index * 100) / BOARD_SIZE;
}

/**
 * Each tile's width/height in % for BOARD_SIZE=4 => 25%.
 */
function getTileSizePercent() {
  return 100 / BOARD_SIZE;
}

/**
 * Start a brand-new game: empty board, spawn 2 tiles, draw once.
 */
function initGame() {
  console.log("initGame(): Starting new game");
  createEmptyBoard();
  spawnTile();
  spawnTile();
  drawBoard();
}

/**
 * On window load, set up event listeners.
 */
window.addEventListener("load", () => {
  console.log("window.load event: Initializing game");
  initGame();

  // Key listener
  window.addEventListener("keydown", handleKey);

  // "New Game" button
  const newGameBtn = document.getElementById("new-game-btn");
  newGameBtn.addEventListener("click", () => {
    console.log("New Game button clicked");
    initGame();
  });
});
