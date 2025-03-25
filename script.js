/****************************************************
 * 1024 Game with Unique-ID Tiles + Value-Based Size
 ****************************************************/
const BOARD_SIZE = 4;
let board = [];
let isAnimating = false;
let nextTileId = 1;

/** Create a new tile object with a unique ID. */
function createTile(value) {
  return { id: nextTileId++, value };
}

/** Create an empty 4x4 board of nulls. */
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

/** Spawn a 2 or 4 in a random empty spot. */
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
 * 2 => 0.6, 1024 => 1.0
 */
function getTileOpacity(value) {
  const minValue = 2;
  const maxValue = 1024;
  const minOpacity = 0.6;
  const maxOpacity = 1.0;

  const val = Math.min(Math.max(value, minValue), maxValue);
  const logVal = Math.log2(val); // 1..10
  const fraction = (logVal - 1) / (10 - 1); // 0..1
  return minOpacity + fraction * (maxOpacity - minOpacity);
}

/** 
 * Renders the board's final state (no animation).
 * Applies size/opacity scaling for each tile.
 */
function drawBoard() {
  const boardEl = document.getElementById("game-board");
  boardEl.innerHTML = "";

  const tileSizePercent = getTileSizePercent();
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const tile = board[r][c];
      if (tile) {
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
}

/** Move board (merge) in direction, spawn tile if changed, return boolean. */
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
 * We keep the first tile's ID, remove the second.
 */
function collapseRowLeft(row) {
  const filtered = row.filter(t => t !== null);
  let didChange = (filtered.length !== row.length);

  for (let i = 0; i < filtered.length - 1; i++) {
    const curr = filtered[i];
    const next = filtered[i + 1];
    if (curr.value === next.value) {
      curr.value += next.value; // keep same ID, update value
      filtered[i + 1] = null;   // second tile removed
      didChange = true;
      i++;
    }
  }
  const merged = filtered.filter(t => t !== null);
  while (merged.length < row.length) {
    merged.push(null);
  }

  // detect final arrangement differences
  for (let j = 0; j < row.length; j++) {
    if (row[j] !== merged[j]) {
      didChange = true;
      break;
    }
  }
  return { newRow: merged, didChange };
}

/** 
 * Animate from oldBoard to newBoard. Scale/opacity are applied
 * to the "temp" tiles also, so they remain consistent with final.
 */
function animateSlide(oldBoard, newBoard) {
  const boardEl = document.getElementById("game-board");
  boardEl.innerHTML = "";

  let tilesAnimating = 0;
  const oldPositions = {}; // tileId => {r,c}

  // gather positions from oldBoard
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const oldTile = oldBoard[r][c];
      if (oldTile) {
        oldPositions[oldTile.id] = { r, c };
      }
    }
  }

  const tileSizePercent = getTileSizePercent();

  // for each tile in newBoard
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

      // check if moved
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

/** Once all animations end, finalize board, check state, let new moves happen. */
function finalizeAnimation(boardEl) {
  boardEl.innerHTML = "";
  drawBoard();
  checkGameState();
  isAnimating = false;
}

/** Makes a deep copy of the board. */
function copyBoard(src) {
  const newB = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    const row = [];
    for (let c = 0; c < BOARD_SIZE; c++) {
      const t = src[r][c];
      if (t) {
        row.push({ id: t.id, value: t.value });
      } else {
        row.push(null);
      }
    }
    newB.push(row);
  }
  return newB;
}

/** Reverses each row (used for 'right' or 'down'). */
function reverseRows(mat) {
  return mat.map(row => row.slice().reverse());
}

/** Transposes the board (used for 'up' or 'down'). */
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

/** Keydown handler => arrow directions => handleMove. */
function handleKey(e) {
  if (isAnimating) return;

  switch (e.key) {
    case "ArrowLeft": e.preventDefault(); handleMove("left"); break;
    case "ArrowRight": e.preventDefault(); handleMove("right"); break;
    case "ArrowUp": e.preventDefault(); handleMove("up"); break;
    case "ArrowDown": e.preventDefault(); handleMove("down"); break;
  }
}

/** Top-level move => check changed => animate or skip. */
function handleMove(direction) {
  if (isAnimating) return;
  const oldB = copyBoard(board);
  const changed = moveBoard(direction);
  if (!changed) return;

  isAnimating = true;
  animateSlide(oldB, board);
}

/** Are there any moves left or is 1024 tile present? */
function checkGameState() {
  // check if any tile is 1024
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const tile = board[r][c];
      if (tile && tile.value === 1024) {
        alert("You made the 1024 tile! (Keep going or restart?)");
        return;
      }
    }
  }
  // check if any moves left
  if (!anyMovesLeft()) {
    alert("Game Over! No moves left.");
  }
}

/** If there's an empty cell or a possible merge, returns true. */
function anyMovesLeft() {
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (!board[r][c]) return true; // empty
    }
  }
  // check merges horizontally
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE - 1; c++) {
      const a = board[r][c], b = board[r][c+1];
      if (a && b && a.value === b.value) return true;
    }
  }
  // check merges vertically
  for (let c = 0; c < BOARD_SIZE; c++) {
    for (let r = 0; r < BOARD_SIZE - 1; r++) {
      const a = board[r][c], b = board[r+1][c];
      if (a && b && a.value === b.value) return true;
    }
  }
  return false;
}

/** Each cell is offset from the top-left in % increments. */
function getOffsetPercent(index) {
  return (index * 100) / BOARD_SIZE;
}

/** Each tile's width/height in % => 25% for a 4×4. */
function getTileSizePercent() {
  return 100 / BOARD_SIZE;
}

/** Initialize a new game. */
function initGame() {
  createEmptyBoard();
  spawnTile();
  spawnTile();
  drawBoard();
}

/** On window load => set up. */
window.addEventListener("load", () => {
  initGame();
  window.addEventListener("keydown", handleKey);

  document.getElementById("new-game-btn").addEventListener("click", () => {
    initGame();
  });
});
