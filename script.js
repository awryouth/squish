/***********************************************************
 * 1024 Game
 * - Unique ID merges
 * - Responsive scaling
 * - Desktop arrow keys
 * - Mobile swipe detection
 ***********************************************************/

// Every few second, change the background colors
setInterval(() => {
  document.body.style.backgroundColor = getRandomColor();
}, 9000);
setInterval(() => {
  const board = document.getElementById("game-board");
  board.style.backgroundColor = getRandomColor();
}, 7000);
setInterval(() => {
  const board = document.getElementById("reset-button");
  board.style.backgroundColor = getRandomColor();
}, 11000);

// Returns a random hex color string like "#A1B2C3"
function getRandomColor() {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    // picks a random character from letters and appends it
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

const BOARD_SIZE = 4;
let board = [];
let isAnimating = false;
let nextTileId = 1;

// For touch/mouse swipe
let touchStartX = null;
let touchStartY = null;
const SWIPE_THRESHOLD = 30; // px distance needed to register a swipe

/**
 * Creates a new tile object with unique id.
 */
function createTile(value) {
  return { id: nextTileId++, value };
}

/**
 * Creates an empty 4x4 board of nulls.
 */
function createEmptyBoard() {
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
 * Spawns a 2 or 4 in a random empty spot.
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
  if (emptyCells.length === 0) return;

  const { r, c } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
  const newVal = Math.random() < 0.9 ? 2 : 4;
  board[r][c] = createTile(newVal);
}

/**
 * -------------- SIZE & OPACITY HELPERS --------------
 * We'll scale from 2..1024 => 0.6..1.2 for scale,
 * and 2..1024 => 0.6..1.0 for opacity.
 * If you want to go beyond 1024 (e.g. 2048), either update the
 * maxValue or clamp logic as needed.
 */

/**
 * Returns a scale factor (0.6 -> 1.2) based on tile value.
 * 2 => 0.6, 1024 => 1.2, linearly in log2 space
 */
function getTileScale(value) {
  const minValue = 2;
  const maxValue = 1024;
  const minScale = 0.6;
  const maxScale = 1.2;

  // We'll clamp tile values to [2, 1024] so we don't exceed range.
  const val = Math.min(Math.max(value, minValue), maxValue);

  // For tile=2 => log2(2)=1, tile=1024 => log2(1024)=10
  const logVal = Math.log2(val);  // from 1..10
  const fraction = (logVal - 1) / (10 - 1); // from 0..1
  return minScale + fraction * (maxScale - minScale);
}

/**
 * Returns an opacity factor (0.6 -> 1.0) based on tile value.
 * 2 => min opacity, 128 => max opacity
 */
function getTileOpacity(value) {
  const minValue = 2;
  const maxValue = 128;
  const minOpacity = 0.8;
  const maxOpacity = 1.0;

  const val = Math.min(Math.max(value, minValue), maxValue);
  const logVal = Math.log2(val); // 1..10
  const fraction = (logVal - 1) / (10 - 1); // 0..1
  return minOpacity + fraction * (maxOpacity - minOpacity);
}

/** 
 * Renders the board's final state (no animation).
 * Applies size/opacity scaling for each tile.
 * Renders the final board (no animation).
 */
function drawBoard() {
  const boardEl = document.getElementById("game-board");
  boardEl.innerHTML = "";

  const tileSizePercent = getTileSizePercent();

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const tile = board[r][c];
      if (!tile) continue;

      const cellEl = document.createElement("div");
      cellEl.classList.add("cell");

      // Position
      cellEl.style.left = getOffsetPercent(c) + "%";
      cellEl.style.top = getOffsetPercent(r) + "%";
      cellEl.style.width = tileSizePercent + "%";
      cellEl.style.height = tileSizePercent + "%";

      // Background image
      cellEl.style.backgroundImage = `url("tiles/${tile.value}.jpg")`;
      cellEl.style.backgroundSize = "cover";

      // Value text
      const tileValue = document.createElement("span");
      tileValue.classList.add("tile-value");
      tileValue.textContent = tile.value;
      cellEl.appendChild(tileValue);

      // Scale & opacity
      const scale = getTileScale(tile.value);
      const opacity = getTileOpacity(tile.value);
      cellEl.style.transform = `scale(${scale})`;
      cellEl.style.opacity = opacity;

      boardEl.appendChild(cellEl);
    }
  }
}

/**
 * Moves board in a direction, merges, spawns tile if changed.
 */
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
    const { newRow, didChange } = collapseRowLeft(board[r]);
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

/**
 * Merges one row to the left.
 */
function collapseRowLeft(row) {
  const filtered = row.filter(t => t !== null);
  let didChange = (filtered.length !== row.length);

  for (let i = 0; i < filtered.length - 1; i++) {
    const curr = filtered[i];
    const next = filtered[i + 1];
    if (curr.value === next.value) {
      curr.value += next.value;
      filtered[i + 1] = null;
      didChange = true;
      i++;
    }
  }
  const merged = filtered.filter(t => t !== null);
  while (merged.length < row.length) {
    merged.push(null);
  }

  for (let j = 0; j < row.length; j++) {
    if (row[j] !== merged[j]) {
      didChange = true;
      break;
    }
  }
  return { newRow: merged, didChange };
}

/**
 * Animates old->new board states.
 */
function animateSlide(oldBoard, newBoard) {
  const boardEl = document.getElementById("game-board");
  boardEl.innerHTML = "";

  let tilesAnimating = 0;
  const oldPositions = {};

  // gather old tile positions
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const oldTile = oldBoard[r][c];
      if (oldTile) {
        oldPositions[oldTile.id] = { r, c };
      }
    }
  }

  const tileSizePercent = getTileSizePercent();

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

      // create temp tile in old position
      const tempTile = document.createElement("div");
      tempTile.classList.add("cell");
      tempTile.style.backgroundImage = `url("tiles/${newTile.value}.jpg")`;
      tempTile.style.backgroundSize = "cover";

      // numeric overlay
      const tileValue = document.createElement("span");
      tileValue.classList.add("tile-value");
      tileValue.textContent = newTile.value;
      tempTile.appendChild(tileValue);

      // position
      tempTile.style.width = tileSizePercent + "%";
      tempTile.style.height = tileSizePercent + "%";
      tempTile.style.left = getOffsetPercent(startC) + "%";
      tempTile.style.top = getOffsetPercent(startR) + "%";

      // scale & fade
      const scale = getTileScale(newTile.value);
      const opacity = getTileOpacity(newTile.value);
      tempTile.style.transform = `scale(${scale})`;
      tempTile.style.opacity = opacity;

      boardEl.appendChild(tempTile);

      // force reflow
      tempTile.getBoundingClientRect();

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
    }
  }
  if (tilesAnimating === 0) {
    finalizeAnimation(boardEl);
  }
}

/**
 * Finalize after animations: re-draw final, check state, allow next move.
 */
function finalizeAnimation(boardEl) {
  boardEl.innerHTML = "";
  drawBoard();
  checkGameState();
  isAnimating = false;
}

/**
 * Deep-copy the board of tile objects.
 */
function copyBoard(source) {
  const newB = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    const row = [];
    for (let c = 0; c < BOARD_SIZE; c++) {
      const tile = source[r][c];
      if (tile) {
        row.push({ id: tile.id, value: tile.value });
      } else {
        row.push(null);
      }
    }
    newB.push(row);
  }
  return newB;
}

/** Reverse each row (for 'right'/'down'). */
function reverseRows(mat) {
  return mat.map(row => row.slice().reverse());
}

/** Transpose the board (for 'up'/'down'). */
function transpose(mat) {
  const out = [];
  for (let c = 0; c < BOARD_SIZE; c++) {
    const newRow = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
      newRow.push(mat[r][c]);
    }
    out.push(newRow);
  }
  return out;
}

/**
 * Handle a single move in direction (arrow or swipe).
 */
function handleMove(direction) {
  if (isAnimating) return;

  const oldB = copyBoard(board);
  const changed = moveBoard(direction);
  if (!changed) return;

  isAnimating = true;
  animateSlide(oldB, board);
}

/**
 * Check if 1024 tile or no moves remain.
 */
function checkGameState() {
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const tile = board[r][c];
      if (tile && tile.value === 1024) {
        alert("You made the 1024 tile! (Keep going or restart?)");
        return;
      }
    }
  }
  if (!anyMovesLeft()) {
    alert("Game Over! No moves left.");
  }
}

/**
 * True if there's an empty cell or a merge possibility.
 */
function anyMovesLeft() {
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (!board[r][c]) return true;
    }
  }
  // check horizontal merges
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE - 1; c++) {
      const a = board[r][c], b = board[r][c+1];
      if (a && b && a.value === b.value) return true;
    }
  }
  // check vertical merges
  for (let c = 0; c < BOARD_SIZE; c++) {
    for (let r = 0; r < BOARD_SIZE - 1; r++) {
      const a = board[r][c], b = board[r+1][c];
      if (a && b && a.value === b.value) return true;
    }
  }
  return false;
}

/**
 * Convert grid index => left/top offset in % for a 4×4.
 */
function getOffsetPercent(index) {
  return (index * 100) / BOARD_SIZE;
}

/** Each tile's width/height => 25% in 4×4. */
function getTileSizePercent() {
  return 100 / BOARD_SIZE;
}

/**
 * KEYBOARD: Listen for arrow keys => handleMove.
 */
function handleKey(e) {
  if (isAnimating) return;
  switch (e.key) {
    case "ArrowLeft": e.preventDefault(); handleMove("left"); break;
    case "ArrowRight": e.preventDefault(); handleMove("right"); break;
    case "ArrowUp": e.preventDefault(); handleMove("up"); break;
    case "ArrowDown": e.preventDefault(); handleMove("down"); break;
  }
}

/**
 * TOUCH: On touchstart, record start coords.
 */
function handleTouchStart(e) {
  // if single touch, track it
  if (e.touches && e.touches.length === 1) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }
}

/**
 * TOUCH: On touchend, compare end coords - start coords to get direction.
 */
function handleTouchEnd(e) {
  if (!touchStartX || !touchStartY) return;

  const touchEndX = e.changedTouches[0].clientX;
  const touchEndY = e.changedTouches[0].clientY;

  const deltaX = touchEndX - touchStartX;
  const deltaY = touchEndY - touchStartY;

  // reset
  touchStartX = null;
  touchStartY = null;

  if (Math.abs(deltaX) < SWIPE_THRESHOLD && Math.abs(deltaY) < SWIPE_THRESHOLD) {
    // Not a big enough swipe
    return;
  }

  // Determine direction
  if (Math.abs(deltaX) > Math.abs(deltaY)) {
    // horizontal
    if (deltaX > 0) {
      handleMove("right");
    } else {
      handleMove("left");
    }
  } else {
    // vertical
    if (deltaY > 0) {
      handleMove("down");
    } else {
      handleMove("up");
    }
  }
}

/**
 * Start a new game.
 */
function initGame() {
  createEmptyBoard();
  spawnTile();
  spawnTile();
  drawBoard();
}

/**
 * Setup event listeners and start the game.
 */
window.addEventListener("load", () => {
  initGame();

  // Keyboard arrows
  window.addEventListener("keydown", handleKey);

  // Touch events
  window.addEventListener("touchstart", handleTouchStart, { passive: false });
  window.addEventListener("touchend", handleTouchEnd);

  // "New Game" button
  document.getElementById("reset-button").addEventListener("click", () => {
    initGame();
  });
});
