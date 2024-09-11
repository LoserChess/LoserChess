const board = document.getElementById("chessboard");
const statusDisplay = document.getElementById("status");
const promotionModal = document.getElementById("promotionModal");
const promotionPieces = document.getElementById("promotionPieces");
let selectedPiece = null;
let currentPlayer = "white";
let promotionSquare = null;

const pieces = {
  white: ["♖", "♘", "♗", "♕", "♔", "♗", "♘", "♖"],
  black: ["♜", "♞", "♝", "♛", "♚", "♝", "♞", "♜"]
};

const promotionPieceSymbols = {
  white: ["♕", "♖", "♗", "♘"],
  black: ["♛", "♜", "♝", "♞"]
};

let whiteCastlingRights = { kingSide: true, queenSide: true };
let blackCastlingRights = { kingSide: true, queenSide: true };

let lastMove = null;

function createBoard() {
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const square = document.createElement("div");
      square.className = `square ${(row + col) % 2 === 0 ? "light" : "dark"}`;
      square.dataset.row = row;
      square.dataset.col = col;

      if (row === 0) {
        square.textContent = pieces.black[col];
        square.dataset.piece = "black" + pieces.black[col];
      } else if (row === 1) {
        square.textContent = "♟";
        square.dataset.piece = "black♟";
      } else if (row === 6) {
        square.textContent = "♙";
        square.dataset.piece = "white♙";
      } else if (row === 7) {
        square.textContent = pieces.white[col];
        square.dataset.piece = "white" + pieces.white[col];
      }

      square.addEventListener("click", handleClick);
      board.appendChild(square);
    }
  }
  updateStatus();
  highlightCapturablePieces();
}

function handleClick(e) {
  const square = e.target;

  if (selectedPiece) {
    if (isValidMove(selectedPiece, square)) {
      movePiece(selectedPiece, square);
      if (isPawnPromotion(square)) {
        showPromotionModal(square);
      } else {
        finishTurn();
      }
    } else if (
      square.dataset.piece &&
      square.dataset.piece.startsWith(currentPlayer)
    ) {
      selectedPiece.classList.remove("selected");
      selectedPiece = square;
      square.classList.add("selected");
      highlightValidMoves(square);
    }
  } else if (
    square.dataset.piece &&
    square.dataset.piece.startsWith(currentPlayer)
  ) {
    selectedPiece = square;
    square.classList.add("selected");
    highlightValidMoves(square);
  }
}

function isValidMove(from, to) {
    const pieceType = from.textContent;
    const fromRow = parseInt(from.dataset.row);
    const fromCol = parseInt(from.dataset.col);
    const toRow = parseInt(to.dataset.row);
    const toCol = parseInt(to.dataset.col);

    if (to.dataset.piece && to.dataset.piece.startsWith(currentPlayer)) {
        return false;  // Can't capture own piece
    }

    const rowDiff = toRow - fromRow;
    const colDiff = toCol - fromCol;

    switch (pieceType) {
        case '♙': // White pawn
            if (colDiff === 0) {  // Moving forward
                if (to.dataset.piece) {
                    return false;  // Can't capture forward
                }
                if (fromRow === 6) {  // First move
                    return rowDiff === -1 || (rowDiff === -2 && !isPathBlocked(fromRow, fromCol, toRow, toCol));
                } else {
                    return rowDiff === -1;
                }
            } else if (Math.abs(colDiff) === 1 && rowDiff === -1) {  // Diagonal capture or en passant
                return to.dataset.piece || isEnPassant(fromRow, fromCol, toRow, toCol);
            }
            return false;
        case '♟': // Black pawn
            if (colDiff === 0) {  // Moving forward
                if (to.dataset.piece) {
                    return false;  // Can't capture forward
                }
                if (fromRow === 1) {  // First move
                    return rowDiff === 1 || (rowDiff === 2 && !isPathBlocked(fromRow, fromCol, toRow, toCol));
                } else {
                    return rowDiff === 1;
                }
            } else if (Math.abs(colDiff) === 1 && rowDiff === 1) {  // Diagonal capture or en passant
                return to.dataset.piece || isEnPassant(fromRow, fromCol, toRow, toCol);
            }
            return false;
    case "♖":
    case "♜": // Rook
      return (
        (fromRow === toRow || fromCol === toCol) &&
        !isPathBlocked(fromRow, fromCol, toRow, toCol)
      );
    case "♘":
    case "♞": // Knight
      return (
        (Math.abs(rowDiff) === 2 && Math.abs(colDiff) === 1) ||
        (Math.abs(rowDiff) === 1 && Math.abs(colDiff) === 2)
      );
    case "♗":
    case "♝": // Bishop
      return (
        Math.abs(rowDiff) === Math.abs(colDiff) &&
        !isPathBlocked(fromRow, fromCol, toRow, toCol)
      );
    case "♕":
    case "♛": // Queen
      return (
        (fromRow === toRow ||
          fromCol === toCol ||
          Math.abs(rowDiff) === Math.abs(colDiff)) &&
        !isPathBlocked(fromRow, fromCol, toRow, toCol)
      );
    case "♔":
    case "♚": // King
      if (Math.abs(rowDiff) <= 1 && Math.abs(colDiff) <= 1) {
        return true;
      } else if (Math.abs(colDiff) === 2 && rowDiff === 0) {
        // Check for castling
        return canCastle(fromRow, fromCol, toCol);
      }
      return false;
    default:
      return false;
  }
}

function highlightCapturablePieces() {
  clearCaptureHighlights();
  const oppositePlayer = currentPlayer === "white" ? "black" : "white";
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const square = document.querySelector(
        `[data-row="${row}"][data-col="${col}"]`
      );
      if (square.dataset.piece && square.dataset.piece.startsWith(oppositePlayer)) {
        if (canBeCaptured(square)) {
          square.classList.add("capture-highlight");
        }
      }
    }
  }
  highlightEnPassantOpportunities();
}

function hasLegalMoves() {
  for (let fromRow = 0; fromRow < 8; fromRow++) {
    for (let fromCol = 0; fromCol < 8; fromCol++) {
      const fromSquare = document.querySelector(
        `[data-row="${fromRow}"][data-col="${fromCol}"]`
      );
      if (fromSquare.dataset.piece && fromSquare.dataset.piece.startsWith(currentPlayer)) {
        for (let toRow = 0; toRow < 8; toRow++) {
          for (let toCol = 0; toCol < 8; toCol++) {
            const toSquare = document.querySelector(
              `[data-row="${toRow}"][data-col="${toCol}"]`
            );
            if (isValidMove(fromSquare, toSquare)) {
              return true;
            }
          }
        }
      }
    }
  }
  return false;
}

function clearCaptureHighlights() {
  document.querySelectorAll(".capture-highlight").forEach((square) => {
    square.classList.remove("capture-highlight");
  });
}

function highlightEnPassantOpportunities() {
  if (!lastMove) return;

  const [lastFromRow, lastFromCol, lastToRow, lastToCol] = lastMove;
  const lastMovePiece = document.querySelector(`[data-row="${lastToRow}"][data-col="${lastToCol}"]`).textContent;

  if ((lastMovePiece === '♙' && lastFromRow === 6 && lastToRow === 4) ||
      (lastMovePiece === '♟' && lastFromRow === 1 && lastToRow === 3)) {
    const enPassantRow = currentPlayer === 'white' ? 3 : 4;
    const leftCol = lastToCol - 1;
    const rightCol = lastToCol + 1;

    [leftCol, rightCol].forEach(col => {
      if (col >= 0 && col < 8) {
        const square = document.querySelector(`[data-row="${enPassantRow}"][data-col="${col}"]`);
        if (square.dataset.piece && square.dataset.piece.startsWith(currentPlayer) &&
            (square.textContent === '♙' || square.textContent === '♟')) {
          const targetSquare = document.querySelector(`[data-row="${lastToRow}"][data-col="${lastToCol}"]`);
          targetSquare.classList.add("capture-highlight");
        }
      }
    });
  }
}

function canBeCaptured(targetSquare) {
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const square = document.querySelector(
        `[data-row="${row}"][data-col="${col}"]`
      );
      if (square.dataset.piece && square.dataset.piece.startsWith(currentPlayer)) {
        if (isValidMove(square, targetSquare)) {
          return true;
        }
      }
    }
  }
  return false;
}

function highlightCapturableFromSquare(fromSquare) {
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const toSquare = document.querySelector(
        `[data-row="${row}"][data-col="${col}"]`
      );
      if (isValidMove(fromSquare, toSquare) && isCapture(fromSquare, toSquare)) {
        toSquare.classList.add("capture-highlight");
      }
    }
  }
}

function isEnPassant(fromRow, fromCol, toRow, toCol) {
    if (!lastMove) return false;

    const [lastFromRow, lastFromCol, lastToRow, lastToCol] = lastMove;
    const lastPiece = document.querySelector(`[data-row="${lastToRow}"][data-col="${lastToCol}"]`).textContent;

    return (
        (lastPiece === '♙' || lastPiece === '♟') &&
        Math.abs(lastToRow - lastFromRow) === 2 &&
        lastToCol === toCol &&
        ((currentPlayer === 'white' && fromRow === 3 && toRow === 2) ||
         (currentPlayer === 'black' && fromRow === 4 && toRow === 5)) &&
        Math.abs(fromCol - lastToCol) === 1
    );
}

function isPathBlocked(fromRow, fromCol, toRow, toCol) {
  const rowStep = Math.sign(toRow - fromRow);
  const colStep = Math.sign(toCol - fromCol);
  let currentRow = fromRow + rowStep;
  let currentCol = fromCol + colStep;

  while (currentRow !== toRow || currentCol !== toCol) {
    const square = document.querySelector(
      `[data-row="${currentRow}"][data-col="${currentCol}"]`
    );
    if (square.dataset.piece) {
      return true; // Path is blocked
    }
    currentRow += rowStep;
    currentCol += colStep;
  }
  return false; // Path is clear
}

function canCastle(fromRow, fromCol, toCol) {
  const isKingSide = toCol > fromCol;
  const castlingRights =
    currentPlayer === "white" ? whiteCastlingRights : blackCastlingRights;

  if (
    (isKingSide && !castlingRights.kingSide) ||
    (!isKingSide && !castlingRights.queenSide)
  ) {
    return false;
  }

  const rookCol = isKingSide ? 7 : 0;
  const rookSquare = document.querySelector(
    `[data-row="${fromRow}"][data-col="${rookCol}"]`
  );

  if (!rookSquare || !rookSquare.textContent.match(/[♖♜]/)) {
    return false;
  }

  // Check if the path is clear
  const startCol = Math.min(fromCol, toCol);
  const endCol = Math.max(fromCol, toCol);
  for (let col = startCol + 1; col < endCol; col++) {
    if (
      document.querySelector(`[data-row="${fromRow}"][data-col="${col}"]`)
        .dataset.piece
    ) {
      return false;
    }
  }

  // Check if the king is not in check and doesn't pass through check
  for (let col = fromCol; col !== toCol; col += isKingSide ? 1 : -1) {
    if (isSquareUnderAttack(fromRow, col)) {
      return false;
    }
  }

  return true;
}

function isSquareUnderAttack(row, col) {
  const oppositePlayer = currentPlayer === "white" ? "black" : "white";
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const square = document.querySelector(
        `[data-row="${r}"][data-col="${c}"]`
      );
      if (
        square.dataset.piece &&
        square.dataset.piece.startsWith(oppositePlayer)
      ) {
        if (
          isValidMove(
            square,
            document.querySelector(`[data-row="${row}"][data-col="${col}"]`)
          )
        ) {
          return true;
        }
      }
    }
  }
  return false;
}

function movePiece(from, to) {
    const pieceType = from.textContent;
    const fromRow = parseInt(from.dataset.row);
    const fromCol = parseInt(from.dataset.col);
    const toRow = parseInt(to.dataset.row);
    const toCol = parseInt(to.dataset.col);

    // Check for en passant capture
    if ((pieceType === '♙' || pieceType === '♟') && Math.abs(fromCol - toCol) === 1 && !to.dataset.piece) {
        const capturedPawnRow = currentPlayer === 'white' ? toRow + 1 : toRow - 1;
        const capturedPawn = document.querySelector(`[data-row="${capturedPawnRow}"][data-col="${toCol}"]`);
        capturedPawn.textContent = '';
        delete capturedPawn.dataset.piece;
    }

    // Check for castling
    if ((pieceType === '♔' || pieceType === '♚') && Math.abs(toCol - fromCol) === 2) {
        const isKingSide = toCol > fromCol;
        const rookFromCol = isKingSide ? 7 : 0;
        const rookToCol = isKingSide ? toCol - 1 : toCol + 1;
        const rookFrom = document.querySelector(`[data-row="${fromRow}"][data-col="${rookFromCol}"]`);
        const rookTo = document.querySelector(`[data-row="${fromRow}"][data-col="${rookToCol}"]`);
        
        // Move the rook
        rookTo.textContent = rookFrom.textContent;
        rookTo.dataset.piece = rookFrom.dataset.piece;
        rookFrom.textContent = '';
        delete rookFrom.dataset.piece;
    }

    // Update castling rights
    if (pieceType === '♔') {
        whiteCastlingRights.kingSide = false;
        whiteCastlingRights.queenSide = false;
    } else if (pieceType === '♚') {
        blackCastlingRights.kingSide = false;
        blackCastlingRights.queenSide = false;
    } else if (pieceType === '♖') {
        if (fromCol === 0) whiteCastlingRights.queenSide = false;
        if (fromCol === 7) whiteCastlingRights.kingSide = false;
    } else if (pieceType === '♜') {
        if (fromCol === 0) blackCastlingRights.queenSide = false;
        if (fromCol === 7) blackCastlingRights.kingSide = false;
    }

    // Move the piece
    to.textContent = from.textContent;
    to.dataset.piece = from.dataset.piece;
    from.textContent = '';
    delete from.dataset.piece;

    // Update lastMove for en passant
    lastMove = [fromRow, fromCol, toRow, toCol];
  
  highlightCapturablePieces();
}

function highlightValidMoves(piece) {
  clearAllHighlights();
  highlightCapturablePieces();
  const fromRow = parseInt(piece.dataset.row);
  const fromCol = parseInt(piece.dataset.col);
  const pieceType = piece.textContent;

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const square = document.querySelector(
        `[data-row="${row}"][data-col="${col}"]`
      );
      if (isValidMove(piece, square)) {
        if (isCastlingMove(pieceType, fromRow, fromCol, row, col)) {
          square.classList.add("castling-highlight");
        } else if (!square.classList.contains("capture-highlight")) {
          square.classList.add("highlight");
        }
      }
    }
  }
}

// NEW FUNCTION
function isCastlingMove(pieceType, fromRow, fromCol, toRow, toCol) {
  return (
    (pieceType === "♔" || pieceType === "♚") &&
    fromRow === toRow &&
    Math.abs(toCol - fromCol) === 2
  );
}

function updateStatus() {
  statusDisplay.textContent = `Current player: ${currentPlayer}`;
}

// UPDATED FUNCTION
function clearHighlights() {
  document
    .querySelectorAll(".highlight, .castling-highlight")
    .forEach((square) => {
      square.classList.remove("highlight", "castling-highlight");
    });
}

function clearAllHighlights() {
  document
    .querySelectorAll(".highlight, .castling-highlight, .capture-highlight")
    .forEach((square) => {
      square.classList.remove("highlight", "castling-highlight", "capture-highlight");
    });
}

function isPawnPromotion(square) {
  const pieceType = square.textContent;
  const row = parseInt(square.dataset.row);
  return (pieceType === "♙" && row === 0) || (pieceType === "♟" && row === 7);
}

function showPromotionModal(square) {
  promotionSquare = square;
  promotionPieces.innerHTML = "";
  promotionPieceSymbols[currentPlayer].forEach((piece) => {
    const pieceElement = document.createElement("span");
    pieceElement.textContent = piece;
    pieceElement.className = "promotion-piece";
    pieceElement.addEventListener("click", () => handlePromotion(piece));
    promotionPieces.appendChild(pieceElement);
  });
  promotionModal.style.display = "block";
}

function handlePromotion(piece) {
  promotionSquare.textContent = piece;
  promotionSquare.dataset.piece = currentPlayer + piece;
  promotionModal.style.display = "none";
  finishTurn();
}

function isCapture(from, to) {
  const fromRow = parseInt(from.dataset.row);
  const fromCol = parseInt(from.dataset.col);
  const toRow = parseInt(to.dataset.row);
  const toCol = parseInt(to.dataset.col);
  const pieceType = from.textContent;

  // Regular capture
  if (to.dataset.piece && !to.dataset.piece.startsWith(currentPlayer)) {
    return true;
  }

  // En passant capture
  if ((pieceType === '♙' || pieceType === '♟') && 
      Math.abs(fromCol - toCol) === 1 && 
      !to.dataset.piece && 
      isEnPassant(fromRow, fromCol, toRow, toCol)) {
    return true;
  }

  return false;
}

function finishTurn() {
  clearAllHighlights();
  if (selectedPiece) {
    selectedPiece.classList.remove("selected");
    selectedPiece = null;
  }
  currentPlayer = currentPlayer === "white" ? "black" : "white";
  updateStatus();
  highlightCapturablePieces();

  // Check if the current player has any legal moves
  if (!hasLegalMoves()) {
    // If no legal moves, switch to the other player
    currentPlayer = currentPlayer === "white" ? "black" : "white";
    updateStatus();
    highlightCapturablePieces();
    statusDisplay.textContent += " - No legal moves, turn skipped.";
  }
}

createBoard();
updateStatus();
highlightCapturablePieces();
