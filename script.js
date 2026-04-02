const boardElement = document.getElementById("board");
const piecesElement = document.getElementById("pieces");
const resetButton = document.getElementById("reset-button");
const roundNumberElement = document.getElementById("round-number");
const statusTextElement = document.getElementById("status-text");

let selectedPieceId = null;
let currentRound = 1;
let pieces = getStagePieces("A");
let previewCells = [];
let previewIsValid = false;

// ========================
// PIECE LIBRARIES BY STAGE
// ========================

const PIECES = {

  A: [
    [[1]],

    [[1,1]],
    [[1,1,1]],

    [[1,0],
     [1,1]],

    [[0,1],
     [1,1]],

    [[1,1],
     [1,1]],

    [[1,1,1],
     [0,1,0]]
  ],

  B: [
    // Stage A inherited automatically later

    [[1,1,1,1]],

    [[1,1,0],
     [0,1,1]],

    [[0,1,1],
     [1,1,0]],

    [[1,0],
     [1,0],
     [1,1]]
  ],

  C: [

    [[0,1,0],
     [1,1,1],
     [0,1,0]],

    [[1,0,0],
     [1,1,0],
     [0,1,1]],

    [[1,1,0],
     [0,1,1],
     [0,0,1]],

    [[1,0,0],
     [1,1,1]],

    [[1,1,0],
     [0,1,0],
     [0,1,1]]
  ],

  D: [

    [[1,1,0],
     [1,1,1]],

    [[1,0,0],
     [1,1,0],
     [1,1,1]],

    [[1,1,1],
     [0,1,0],
     [0,1,0]],

    [[1,0,0],
     [1,1,1],
     [0,0,1]],

    [[1,1,1],
     [1,0,1]]
  ],

  E: [

    [[1,1,1,0],
     [0,1,1,1]],

    [[1,1,0],
     [1,0,0],
     [1,1,1]],

    [[1,0,1],
     [1,1,1],
     [1,0,1]],

    [[1,1,1],
     [1,0,0],
     [1,1,0],
     [0,1,1]]
  ]

};

function getStagePieces(stage) {

  const order = ["A","B","C","D","E"];

  const index = order.indexOf(stage);

  let pieces = [];

  for (let i = 0; i <= index; i++) {
    pieces = pieces.concat(PIECES[order[i]]);
  }

  return pieces;
}

function getStageForRound(round) {
  if (round <= 3) return "A";
  if (round <= 7) return "B";
  if (round <= 13) return "C";
  if (round <= 20) return "D";
  return "E";
}

function startRound() {

  const stage = getStageForRound(currentRound);

  pieces = getStagePieces(stage).map((shape, index) => ({
    id: index,
    shape: cloneShape(shape)
  }));

  selectedPieceId = null;

  renderPieces();
  renderBoard();

  roundNumberElement.textContent = currentRound;
}

let boardSize = rounds[0].boardSize;
let boardState = [];
let targetCells = [];

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

function createEmptyBoard(size) {
  return Array.from({ length: size }, () => Array(size).fill(0));
}

function getStageForRound(round) {
  if (round <= 3) return "A";
  if (round <= 7) return "B";
  if (round <= 13) return "C";
  if (round <= 20) return "D";
  return "E";
}

const STAGE_LEVELS = {
  A: [],
  B: [],
  C: [],
  D: [],
  E: []
};

STAGE_LEVELS.A.push({
  boardSize: 5,

  shape: [
    [0,0,0,0,0],
    [0,1,1,1,0],
    [0,1,1,1,0],
    [0,0,0,0,0],
    [0,0,0,0,0]
  ],

  pieces: [
    [[1,1,1]],
    [[1,1,1]]
  ]
});

function loadRound(roundNumber) {
  const stage = getStageForRound(roundNumber);
  const stageLevels = STAGE_LEVELS[stage];

  if (!stageLevels || stageLevels.length === 0) {
    console.warn("No levels for stage:", stage);
    return;
  }

  const roundData = stageLevels[Math.floor(Math.random() * stageLevels.length)];

  currentRound = roundNumber;
  boardSize = roundData.boardSize;
  boardState = createEmptyBoard(boardSize);
  targetCells = roundData.shape.map((row) => [...row]);
  selectedPieceId = null;
  previewCells = [];
  previewIsValid = false;

  pieces = roundData.pieces.map((shape, index) => ({
    id: index + 1,
    used: false,
    shape: cloneShape(shape)
  }));

  boardElement.style.gridTemplateColumns = `repeat(${boardSize}, 60px)`;
  boardElement.style.gridTemplateRows = `repeat(${boardSize}, 60px)`;

  roundNumberElement.textContent = currentRound;
  statusTextElement.textContent = "Fill the white puzzle shape exactly.";

  renderBoard();
  renderPieces();
}

function renderBoard() {
  boardElement.innerHTML = "";

  for (let row = 0; row < boardSize; row++) {
    for (let col = 0; col < boardSize; col++) {
      const cell = document.createElement("button");
      cell.className = "cell";
      cell.type = "button";

      const isTargetCell = targetCells[row][col] === 1;
      const isFilledCell = boardState[row][col] === 1;

      if (!isTargetCell) {
        cell.classList.add("blocked");
        cell.disabled = true;
      } else {
        cell.classList.add("target");
      }

      if (isFilledCell) {
        cell.classList.add("filled");
      }

      const isPreviewCell = previewCells.some(
        (previewCell) => previewCell.row === row && previewCell.col === col
      );

      if (isPreviewCell && !isFilledCell) {
        cell.classList.add(previewIsValid ? "preview-valid" : "preview-invalid");
      }

      cell.addEventListener("mouseenter", () => {
        updatePreview(row, col);
      });

      cell.addEventListener("mouseleave", () => {
        clearPreview();
      });

      cell.addEventListener("click", () => {
        placeSelectedPiece(row, col);
      });

      boardElement.appendChild(cell);
    }
  }
}

function renderPieces() {
  piecesElement.innerHTML = "";

  pieces.forEach((piece) => {
    if (piece.used) {
      return;
    }

    const pieceElement = document.createElement("button");
    pieceElement.className = "piece";
    pieceElement.type = "button";

    if (selectedPieceId === piece.id) {
      pieceElement.classList.add("selected");
    }

    const rows = piece.shape.length;
    const cols = piece.shape[0].length;

    pieceElement.style.gridTemplateColumns = `repeat(${cols}, 28px)`;
    pieceElement.style.gridTemplateRows = `repeat(${rows}, 28px)`;

    piece.shape.forEach((row) => {
      row.forEach((value) => {
        const pieceCell = document.createElement("div");
        pieceCell.className = "piece-cell";

        if (value === 0) {
          pieceCell.classList.add("empty");
        }

        pieceElement.appendChild(pieceCell);
      });
    });

    pieceElement.addEventListener("click", () => {
      if (selectedPieceId === piece.id) {
        piece.shape = rotateShape(piece.shape);
        statusTextElement.textContent = "Piece rotated.";
      } else {
        selectedPieceId = piece.id;
        statusTextElement.textContent =
          "Piece selected. Click the board to place it. Click the piece again to rotate it.";
      }

      renderPieces();
    });

    piecesElement.appendChild(pieceElement);
  });
}

function canPlacePiece(piece, startRow, startCol) {
  for (let row = 0; row < piece.shape.length; row++) {
    for (let col = 0; col < piece.shape[row].length; col++) {
      if (piece.shape[row][col] === 0) {
        continue;
      }

      const boardRow = startRow + row;
      const boardCol = startCol + col;

      if (
        boardRow < 0 ||
        boardRow >= boardSize ||
        boardCol < 0 ||
        boardCol >= boardSize
      ) {
        return false;
      }

      if (targetCells[boardRow][boardCol] !== 1) {
        return false;
      }

      if (boardState[boardRow][boardCol] === 1) {
        return false;
      }
    }
  }

  return true;
}

function updatePreview(startRow, startCol) {
  if (selectedPieceId === null) {
    return;
  }

  const piece = pieces.find((p) => p.id === selectedPieceId);

  if (!piece || piece.used) {
    return;
  }

  const nextPreviewCells = [];

  for (let row = 0; row < piece.shape.length; row++) {
    for (let col = 0; col < piece.shape[row].length; col++) {
      if (piece.shape[row][col] === 0) {
        continue;
      }

      nextPreviewCells.push({
        row: startRow + row,
        col: startCol + col
      });
    }
  }

  previewCells = nextPreviewCells;
  previewIsValid = canPlacePiece(piece, startRow, startCol);
  renderBoard();
}

function clearPreview() {
  if (previewCells.length === 0) {
    return;
  }

  previewCells = [];
  previewIsValid = false;
  renderBoard();
}

function placeSelectedPiece(startRow, startCol) {
  if (selectedPieceId === null) {
    return;
  }

  const piece = pieces.find((p) => p.id === selectedPieceId);

  if (!piece || piece.used) {
    return;
  }

  if (!canPlacePiece(piece, startRow, startCol)) {
    statusTextElement.textContent = "That piece does not fit there.";
    return;
  }

  for (let row = 0; row < piece.shape.length; row++) {
    for (let col = 0; col < piece.shape[row].length; col++) {
      if (piece.shape[row][col] === 1) {
        boardState[startRow + row][startCol + col] = 1;
      }
    }
  }

  piece.used = true;
  selectedPieceId = null;
  previewCells = [];
  previewIsValid = false;

  renderBoard();
  renderPieces();
  checkWin();
}

function checkWin() {
  for (let row = 0; row < boardSize; row++) {
    for (let col = 0; col < boardSize; col++) {
      if (targetCells[row][col] === 1 && boardState[row][col] !== 1) {
        statusTextElement.textContent = "Good move. Fill the remaining spaces.";
        return;
      }
    }
  }

  statusTextElement.textContent = `Round ${currentRound} cleared!`;

  if (currentRound < rounds.length) {
    setTimeout(() => {
      loadRound(currentRound + 1);
    }, 700);
  }
}

function resetGame() {
  loadRound(1);
}

resetButton.addEventListener("click", resetGame);

loadRound(1);
