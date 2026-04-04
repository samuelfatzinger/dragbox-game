const boardElement = document.getElementById("board");
const piecesElement = document.getElementById("pieces");
const resetButton = document.getElementById("reset-button");
const roundNumberElement = document.getElementById("round-number");
const statusTextElement = document.getElementById("status-text");

let currentRound = 1;
let boardSize = 5;
let targetCells = [];
let pieces = [];
let trayShapes = [];
let nextPieceId = 1;
let stageLevelQueues = {};

let pointerDownPieceId = null;
let pointerDownOrigin = null;
let pointerStartX = 0;
let pointerStartY = 0;
let isDragging = false;
let draggingPieceId = null;
let dragReturnPosition = null;
let dragPointerX = 0;
let dragPointerY = 0;
let dragGhostElement = null;

const DRAG_THRESHOLD = 6;
const TRAY_CELL_SIZE = 28;

const STAGE_SHAPE_POOLS = {
  A: [
    [[1]],
    [[1, 1]],
    [[1, 1, 1]],
    [[0, 1, 0],
     [1, 1, 1]],
    [[1, 0],
     [1, 1]],
    [[1, 1],
     [1, 1]]
  ],
  B: [],
  C: [],
  D: [],
  E: []
};

const STAGE_LEVELS = {
  A: [
    {
      boardSize: 5,
      parPieces: 3,
      maxPieces: 5,
      shape: [
        [0, 0, 0, 0, 0],
        [0, 1, 1, 1, 0],
        [0, 1, 1, 1, 0],
        [0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0]
      ]
    },
    {
      boardSize: 5,
      parPieces: 3,
      maxPieces: 5,
      shape: [
        [0, 0, 0, 0, 0],
        [0, 1, 1, 1, 0],
        [0, 1, 0, 1, 0],
        [0, 1, 1, 1, 0],
        [0, 0, 0, 0, 0]
      ]
    },
    {
      boardSize: 5,
      parPieces: 3,
      maxPieces: 5,
      shape: [
        [0, 0, 0, 0, 0],
        [0, 1, 1, 0, 0],
        [0, 1, 1, 1, 0],
        [0, 0, 1, 1, 0],
        [0, 0, 0, 0, 0]
      ]
    },
    {
      boardSize: 5,
      parPieces: 3,
      maxPieces: 5,
      shape: [
        [0, 0, 0, 0, 0],
        [0, 0, 1, 0, 0],
        [0, 1, 1, 1, 0],
        [0, 0, 1, 0, 0],
        [0, 0, 0, 0, 0]
      ]
    },
    {
      boardSize: 5,
      parPieces: 3,
      maxPieces: 5,
      shape: [
        [0, 0, 0, 0, 0],
        [0, 1, 1, 0, 0],
        [0, 1, 1, 1, 0],
        [0, 1, 1, 1, 0],
        [0, 0, 0, 0, 0]
      ]
    },
    {
      boardSize: 5,
      parPieces: 3,
      maxPieces: 5,
      shape: [
        [0, 1, 0, 0, 0],
        [0, 1, 1, 0, 0],
        [0, 1, 1, 1, 0],
        [0, 0, 1, 1, 0],
        [0, 0, 0, 1, 0]
      ]
    },
    {
      boardSize: 5,
      parPieces: 3,
      maxPieces: 5,
      shape: [
        [0, 1, 0, 0, 0],
        [0, 1, 1, 1, 0],
        [0, 0, 0, 1, 0],
        [0, 1, 1, 1, 0],
        [0, 1, 0, 0, 0]
      ]
    },
    {
      boardSize: 5,
      parPieces: 3,
      maxPieces: 5,
      shape: [
        [0, 0, 0, 0, 0],
        [0, 1, 1, 1, 0],
        [0, 0, 1, 1, 0],
        [0, 1, 0, 1, 0],
        [0, 0, 0, 0, 0]
      ]
    }
  ],
  B: [],
  C: [],
  D: [],
  E: []
};

function cloneShape(shape) {
  return shape.map((row) => [...row]);
}

function rotateShape(shape) {
  const rows = shape.length;
  const cols = shape[0].length;
  const rotated = [];

  for (let col = 0; col < cols; col++) {
    const newRow = [];

    for (let row = rows - 1; row >= 0; row--) {
      newRow.push(shape[row][col]);
    }

    rotated.push(newRow);
  }

  return rotated;
}

function getStageForRound(round) {
  if (round <= 3) return "A";
  if (round <= 7) return "B";
  if (round <= 13) return "C";
  if (round <= 20) return "D";
  return "E";
}

function shuffleArray(array) {
  const copy = [...array];

  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
}

function getRandomStageLevel(stage) {
  const stageLevels = STAGE_LEVELS[stage];

  if (!stageLevels || stageLevels.length === 0) {
    return null;
  }

  if (!stageLevelQueues[stage] || stageLevelQueues[stage].length === 0) {
    stageLevelQueues[stage] = shuffleArray(stageLevels);
  }

  return stageLevelQueues[stage].pop();
}

function getBoardCellSize() {
  const rect = boardElement.getBoundingClientRect();

  if (!rect.width || boardSize === 0) {
    return 56;
  }

  return rect.width / boardSize;
}

function getPieceById(pieceId) {
  return pieces.find((piece) => piece.id === pieceId) || null;
}

function createOccupancyMap(ignorePieceId = null) {
  const map = Array.from({ length: boardSize }, () => Array(boardSize).fill(null));

  pieces.forEach((piece) => {
    if (!piece.position || piece.id === ignorePieceId) {
      return;
    }

    const cells = getFilledCellsForPiece(piece, piece.position.row, piece.position.col);

    cells.forEach(({ row, col }) => {
      if (row >= 0 && row < boardSize && col >= 0 && col < boardSize) {
        map[row][col] = piece.id;
      }
    });
  });

  return map;
}

function getFilledCellsForPiece(piece, startRow, startCol) {
  const cells = [];

  for (let row = 0; row < piece.shape.length; row++) {
    for (let col = 0; col < piece.shape[row].length; col++) {
      if (piece.shape[row][col] === 1) {
        cells.push({
          row: startRow + row,
          col: startCol + col
        });
      }
    }
  }

  return cells;
}

function canPlacePieceAt(piece, startRow, startCol, ignorePieceId = null) {
  const occupancyMap = createOccupancyMap(ignorePieceId);
  const cells = getFilledCellsForPiece(piece, startRow, startCol);

  for (const cell of cells) {
    if (
      cell.row < 0 ||
      cell.row >= boardSize ||
      cell.col < 0 ||
      cell.col >= boardSize
    ) {
      return false;
    }

    if (targetCells[cell.row][cell.col] !== 1) {
      return false;
    }

    if (occupancyMap[cell.row][cell.col] !== null) {
      return false;
    }
  }

  return true;
}

function isPuzzleSolved() {
  const occupancyMap = createOccupancyMap();

  for (let row = 0; row < boardSize; row++) {
    for (let col = 0; col < boardSize; col++) {
      const targetFilled = targetCells[row][col] === 1;
      const boardFilled = occupancyMap[row][col] !== null;

      if (targetFilled !== boardFilled) {
        return false;
      }
    }
  }

  return true;
}

function loadRound(roundNumber) {
  currentRound = roundNumber;

  const stage = getStageForRound(roundNumber);
  const level = getRandomStageLevel(stage);

  if (!level) {
    roundNumberElement.textContent = currentRound;
    statusTextElement.textContent = "No more defined levels.";
    pieces = [];
    trayShapes = [];
    targetCells = Array.from({ length: boardSize }, () => Array(boardSize).fill(0));
    renderBoard();
    renderPieces();
    return;
  }

  boardSize = level.boardSize;
  targetCells = level.shape.map((row) => [...row]);

  const stageShapes = STAGE_SHAPE_POOLS[stage] || [];
  trayShapes = stageShapes.map((shape) => cloneShape(shape));

  pieces = [];
  nextPieceId = 1;

  clearDragState();

  roundNumberElement.textContent = currentRound;
  statusTextElement.textContent = `Round ${currentRound}`;

  renderBoard();
  renderPieces();
}

function renderBoard() {
  boardElement.innerHTML = "";

  const occupancyMap = createOccupancyMap();

  for (let row = 0; row < boardSize; row++) {
    for (let col = 0; col < boardSize; col++) {
      const cell = document.createElement("button");
      cell.className = "cell";
      cell.type = "button";

      const isTargetCell = targetCells[row][col] === 1;
      const occupyingPieceId = occupancyMap[row][col];

      if (!isTargetCell) {
        cell.classList.add("blocked");
        cell.disabled = true;
      } else {
        cell.classList.add("target");
      }

      if (occupyingPieceId !== null) {
        cell.classList.add("filled");
      }

      if (occupyingPieceId !== null) {
        cell.addEventListener("pointerdown", (e) => {
          e.preventDefault();
          beginBoardPieceDrag(occupyingPieceId, e);
        });
      }

      boardElement.appendChild(cell);
    }
  }
}

function renderPieces() {
  piecesElement.innerHTML = "";

  document.querySelectorAll(".floating-piece").forEach((el) => el.remove());

  trayShapes.forEach((shape, index) => {
    const trayPiece = {
      id: `tray-${index}`,
      shape,
      isTrayShape: true
    };

    const pieceElement = createPieceElement(trayPiece, TRAY_CELL_SIZE);

    pieceElement.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      beginTrayPieceInteraction(index, e);
    });

    piecesElement.appendChild(pieceElement);
  });

  const freeCellSize = getBoardCellSize();

  pieces
    .filter((piece) => piece.position === null && piece.freePosition)
    .forEach((piece) => {
      const pieceElement = createPieceElement(piece, freeCellSize);
      pieceElement.classList.add("floating-piece");
      pieceElement.style.position = "fixed";
      pieceElement.style.left = `${piece.freePosition.x}px`;
      pieceElement.style.top = `${piece.freePosition.y}px`;
      pieceElement.style.zIndex = "30";

      pieceElement.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        pointerDownPieceId = piece.id;
        pointerDownOrigin = "free";
        pointerStartX = e.clientX;
        pointerStartY = e.clientY;
      });

      document.body.appendChild(pieceElement);
    });
}

function createPieceElement(piece, cellSize) {
  const pieceElement = document.createElement("button");
  pieceElement.className = "piece";
  pieceElement.type = "button";
  pieceElement.style.gridTemplateColumns = `repeat(${piece.shape[0].length}, ${cellSize}px)`;
  pieceElement.style.gridTemplateRows = `repeat(${piece.shape.length}, ${cellSize}px)`;
  pieceElement.style.gap = "0px";

  const fillColor =
    piece.isTrayShape || piece.position === null
      ? "#4f7cff"
      : "#f19b13";

  piece.shape.forEach((row) => {
    row.forEach((value) => {
      const pieceCell = document.createElement("div");
      pieceCell.className = "piece-cell";
      pieceCell.style.width = `${cellSize}px`;
      pieceCell.style.height = `${cellSize}px`;

      if (value === 0) {
        pieceCell.classList.add("empty");
      } else {
        pieceCell.style.backgroundColor = fillColor;
      }

      pieceElement.appendChild(pieceCell);
    });
  });

  return pieceElement;
}

function beginTrayPieceInteraction(trayIndex, event) {
  const newPiece = {
    id: nextPieceId++,
    shape: cloneShape(trayShapes[trayIndex]),
    position: null,
    freePosition: null
  };

  pieces.push(newPiece);

  pointerDownPieceId = newPiece.id;
  pointerDownOrigin = "tray";
  pointerStartX = event.clientX;
  pointerStartY = event.clientY;
}

function beginBoardPieceDrag(pieceId, event) {
  const piece = getPieceById(pieceId);

  if (!piece || !piece.position) {
    return;
  }

  pointerDownPieceId = pieceId;
  pointerDownOrigin = "board";
  pointerStartX = event.clientX;
  pointerStartY = event.clientY;

  startDraggingPiece(pieceId, "board", event.clientX, event.clientY);
}

function startDraggingPiece(pieceId, origin, clientX, clientY) {
  const piece = getPieceById(pieceId);

  if (!piece) {
    return;
  }

  isDragging = true;
  draggingPieceId = pieceId;
  dragPointerX = clientX;
  dragPointerY = clientY;
  dragReturnPosition = piece.position ? { ...piece.position } : null;

  if (origin === "board") {
    piece.position = null;
    piece.freePosition = null;
    renderBoard();
    renderPieces();
  } else if (origin === "free") {
    piece.freePosition = null;
    renderPieces();
  } else {
    renderPieces();
  }

  renderDragGhost();
}

function renderDragGhost() {
  removeDragGhost();

  const piece = getPieceById(draggingPieceId);

  if (!piece) {
    return;
  }

  const cellSize = getBoardCellSize();
  const ghost = createPieceElement(piece, cellSize);

  ghost.style.position = "fixed";
  ghost.style.left = dragPointerX - (piece.shape[0].length * cellSize) / 2 + "px";
  ghost.style.top = dragPointerY - (piece.shape.length * cellSize) / 2 + "px";
  ghost.style.zIndex = "1000";
  ghost.style.pointerEvents = "none";
  ghost.style.opacity = "0.92";

  document.body.appendChild(ghost);
  dragGhostElement = ghost;
}

function updateDragGhost() {
  if (!dragGhostElement) {
    renderDragGhost();
    return;
  }

  const piece = getPieceById(draggingPieceId);

  if (!piece) {
    return;
  }

  const cellSize = getBoardCellSize();

  dragGhostElement.style.left = dragPointerX - (piece.shape[0].length * cellSize) / 2 + "px";
  dragGhostElement.style.top = dragPointerY - (piece.shape.length * cellSize) / 2 + "px";
}

function removeDragGhost() {
  if (dragGhostElement) {
    dragGhostElement.remove();
    dragGhostElement = null;
  }
}

function clearDragState() {
  pointerDownPieceId = null;
  pointerDownOrigin = null;
  pointerStartX = 0;
  pointerStartY = 0;
  isDragging = false;
  draggingPieceId = null;
  dragReturnPosition = null;
  removeDragGhost();
}

function dropDraggingPiece(clientX, clientY) {
  const piece = getPieceById(draggingPieceId);
  if (!piece) {
    clearDragState();
    renderBoard();
    renderPieces();
    return;
  }

  const boardRect = boardElement.getBoundingClientRect();
  const piecesRect = piecesElement.getBoundingClientRect();
  const cellSize = getBoardCellSize();

  const relativeX = clientX - boardRect.left;
  const relativeY = clientY - boardRect.top;
  const startCol = Math.round(relativeX / cellSize - piece.shape[0].length / 2);
  const startRow = Math.round(relativeY / cellSize - piece.shape.length / 2);

  const insideBoard =
    clientX >= boardRect.left &&
    clientX <= boardRect.right &&
    clientY >= boardRect.top &&
    clientY <= boardRect.bottom;

  const insideTray =
    clientX >= piecesRect.left &&
    clientX <= piecesRect.right &&
    clientY >= piecesRect.top &&
    clientY <= piecesRect.bottom;

  if (insideBoard && canPlacePieceAt(piece, startRow, startCol)) {
    piece.position = { row: startRow, col: startCol };
    piece.freePosition = null;
  } else if (insideTray) {
    pieces = pieces.filter((p) => p.id !== piece.id);
  } else {
    piece.position = null;
    piece.freePosition = {
      x: clientX - (piece.shape[0].length * cellSize) / 2,
      y: clientY - (piece.shape.length * cellSize) / 2
    };
  }

  clearDragState();
  renderBoard();
  renderPieces();

  if (isPuzzleSolved()) {
    statusTextElement.textContent = `Round ${currentRound} cleared!`;
    setTimeout(() => {
      loadRound(currentRound + 1);
    }, 500);
  } else {
    statusTextElement.textContent = `Round ${currentRound}`;
  }
}

function rotateFreePiece(pieceId) {
  const piece = getPieceById(pieceId);

  if (!piece || piece.position !== null) {
    return;
  }

  piece.shape = rotateShape(piece.shape);
  renderPieces();
}

function rotateTrayPiece(pieceId) {
  const piece = getPieceById(pieceId);

  if (!piece || piece.position !== null) {
    return;
  }

  piece.shape = rotateShape(piece.shape);
  renderPieces();
}

window.addEventListener("pointermove", (event) => {
  if (pointerDownPieceId === null) {
    return;
  }

  if (!isDragging) {
    const movedX = event.clientX - pointerStartX;
    const movedY = event.clientY - pointerStartY;
    const distance = Math.hypot(movedX, movedY);

    if (distance >= DRAG_THRESHOLD) {
      startDraggingPiece(pointerDownPieceId, pointerDownOrigin, event.clientX, event.clientY);
    }
  }

  if (isDragging) {
    dragPointerX = event.clientX;
    dragPointerY = event.clientY;
    updateDragGhost();
  }
});

window.addEventListener("pointerup", (event) => {
  if (pointerDownPieceId === null) {
    return;
  }

  if (isDragging) {
    dropDraggingPiece(event.clientX, event.clientY);
    return;
  }

  if (pointerDownOrigin === "free") {
    rotateFreePiece(pointerDownPieceId);
  }

  clearDragState();
});

function resetGame() {
  stageLevelQueues = {};
  loadRound(1);
}

resetButton.addEventListener("click", resetGame);

loadRound(1);