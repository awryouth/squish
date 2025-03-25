/**************************************
 * 1024 Game with Unique-ID Tiles
 **************************************/

const BOARD_SIZE = 4;
let board = [];         // 2D array of tile objects or null
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
  console.log(`spawnTile(): Spawned a tile {id:${board[r][c].id}, value:${newValue}} at [${r},${c}]`);
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
  const oldBoard = copyBoard(board);    // snapshot

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
      curr.value += next.value;  // Keep curr.id, curr.value updated
      filtered[i + 1] = null;    // "Remove" next
      didChange = true;
      console.log(`collapseRowLeft(): Merging tile [id:${next.id}] -> [id:${curr.id}], newValue=${curr.value}`);
      i++; // Skip the next tile
    }
  }

  // Filter out null merges
  const merged = filtered.filter(tile => tile !== null);

  // Pad with null to maintain row size
  while (merged.length < row.length) {
    merged.push(null);
  }

  // Check if final arrangement differs from input
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
 * If tile is new, we treat it as spawned in place.
 * If tile doesn't exist in new, it disappeared (merged).
 */
function animateSlide(oldBoard, newBoard) {
  console.log("animateSlide() called");
  const boardEl = document.getElementById("game-board");
  boardEl.innerHTML = "";

  let tilesAnimating = 0;

  // We'll create a map of old tile ID -> {r,c} so we can quickly find old position
  const oldPositions = {};
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const tile = oldBoard[r][c];
      if (tile) {
        oldPositions[tile.id] = { r, c };
      }
    }
  }

  // For drawing final positions, each tile in newBoard has an ID we can look for in oldPositions
  const tileSize = getTileSizePercent();

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const newTile = newBoard[r][c];
      if (!newTile) continue;

      // Let's see if it existed in oldPositions
      const oldPos = oldPositions[newTile.id];
      let startR = r;
      let startC = c;
      let isNew = true;

      if (oldPos) {
        // The tile was in oldBoard. We'll animate from oldPos to newPos
        startR = oldPos.r;
        startC = oldPos.c;
        isNew = (startR === r && startC === c) ? false : true; 
      }

      console.log(
        `animateSlide(): tile [id:${newTile.id}, val:${newTile.value}] from (${startR},${startC}) to (${r},${c})`
      );

      // Create a temp <div> to animate
      const tempTile = document.createElement("div");
      tempTile.classList.add("cell");
      tempTile.style.backgroundImage = `url("tiles/${newTile.value}.jpg")`;
      tempTile.style.backgroundSize = "cover";

      // Numeric label
      const tileValue = document.createElement("span");
      tileValue.classList.add("tile-value");
      tileValue.textContent = newTile.value;
      tempTile.appendChild(tileValue);

      // Start at old pos
      tempTile.style.width = tileSize + "%";
      tempTile.style.height = tileSize + "%";
      tempTile.style.left = getOffsetPercent(startC) + "%";
      tempTile.style.top = getOffsetPercent(startR) + "%";

      boardEl.appendChild(tempTile);

      // Force reflow
      tempTile.getBoundingClientRect();

      // If the tile actually moved or is newly spawned at a different spot:
      // We'll animate. If it didn't move, there's no transition.
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
      // If the tile is in the same spot (no movement),
      // we do nothing – no transition event will fire. 
      // We'll just let it remain in place.
    }
  }

  // If no tiles are animating, finalize immediately
  if (tilesAnimating === 0) {
    console.log("animateSlide(): No tiles animating, finalizing immediately");
    finalizeAnimation(boardEl);
  }
}

/**
 * Once all animations are done (or if none started), we:
 * 1. Clear temporary tiles,
 * 2. Draw the final board,
 * 3. Check game state,
 * 4. Clear isAnimating so we can move again.
 */
function finalizeAnimation(boardEl) {
  boardEl.innerHTML = "";
  drawBoard();
  checkGameState();
  isAnimating = false;
}

/**
 * Creates a deep copy of the 2D board of {id, value} or null.
 * Each tile object is also cloned (new object with same id and value).
 */
function copyBoard(sourceBoard) {
  console.log("copyBoard() called (deep clone with tile IDs/values)");
  const newBoard = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    const row = [];
    for (let c = 0; c < BOARD_SIZE; c++) {
      const tile = sourceBoard[r][c];
      if (tile) {
        // clone the tile object so merges won't mutate it for oldBoard
        row.push({ id: tile.id, value: tile.value });
      } else {
        row.push(null);
      }
    }
    newBoard.push(row);
  }
  return newBoard;
}

/**
 * Returns a new 2D array where each row is reversed (used for right/down).
 */
function reverseRows(mat) {
  console.log("reverseRows() called");
  return mat.map(row => row.slice().reverse());
}

/**
 * Transposes the 2D array (rows -> columns).
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
 * Check if game is won or lost. 
 */
function checkGameState() {
  console.log("checkGameState() called");
  // Check for 1024
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const tile = board[r][c];
      if (tile && tile.value === 1024) {
        console.log("checkGameState(): 1024 tile found, player wins!");
        alert("You made the 1024 tile! (Keep going or restart?)");
        return;
      }
    }
  }

  // Check if any moves left
  if (!anyMovesLeft()) {
    console.log("checkGameState(): No moves left, game over");
    alert("Game Over! No moves left.");
  }
}

/**
 * Returns true if there's an empty cell or a valid merge opportunity.
 */
function anyMovesLeft() {
  console.log("anyMovesLeft() called");
  // Check for empty cell
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === null) {
        return true;
      }
    }
  }
  // Check merges horizontally
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE - 1; c++) {
      const curr = board[r][c];
      const next = board[r][c + 1];
      if (curr && next && curr.value === next.value) {
        return true;
      }
    }
  }
  // Check merges vertically
  for (let c = 0; c < BOARD_SIZE; c++) {
    for (let r = 0; r < BOARD_SIZE - 1; r++) {
      const curr = board[r][c];
      const below = board[r + 1][c];
      if (curr && below && curr.value === below.value) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Compute the left/top offset in % for a cell index in a 4x4 grid.
 */
function getOffsetPercent(index) {
  return (index * 100) / BOARD_SIZE;
}

/**
 * Each tile’s width/height in % for a 4x4 grid => 25%.
 */
function getTileSizePercent() {
  return 100 / BOARD_SIZE;
}

/**
 * Initialize a fresh game, spawn 2 tiles, draw once.
 */
function initGame() {
  console.log("initGame(): Starting new game");
  // Reset ID counter if you want fresh IDs each game
  // nextTileId = 1;

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

  window.addEventListener("keydown", handleKey);
  document.getElementById("new-game-btn").addEventListener("click", () => {
    console.log("New Game button clicked");
    initGame();
  });
});
