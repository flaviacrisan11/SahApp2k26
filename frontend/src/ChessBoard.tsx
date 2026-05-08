import React, { useState, useEffect, useRef } from 'react';
import './ChessBoard.css';
import ChessTimer from './ChessTimer';
import ChatPanel from './ChatPanel';
import { createGame, saveMove, finishGame, toChessNotation } from './chessApi';

// =====================
// TIPURI DE DATE
// =====================
type Piece = string | null;
type Board = Piece[][];
type Position = { row: number; col: number } | null;

const WHITE_PIECES = ['♙', '♖', '♘', '♗', '♕', '♔'];
const BLACK_PIECES = ['♟', '♜', '♞', '♝', '♛', '♚'];

const isWhitePiece = (p: Piece): boolean => p !== null && WHITE_PIECES.includes(p);
const isBlackPiece = (p: Piece): boolean => p !== null && BLACK_PIECES.includes(p);
const isEnemy = (p: Piece, isWhite: boolean): boolean => isWhite ? isBlackPiece(p) : isWhitePiece(p);
const isEmpty = (p: Piece): boolean => p === null;

// =====================
// LOGICA MUTĂRILOR
// =====================

const getPawnMoves = (board: Board, row: number, col: number, isWhite: boolean): Position[] => {
    const moves: Position[] = [];
    const dir = isWhite ? -1 : 1;
    const startRow = isWhite ? 6 : 1;

    if (row + dir >= 0 && row + dir < 8 && isEmpty(board[row + dir][col])) {
        moves.push({ row: row + dir, col });
        if (row === startRow && isEmpty(board[row + 2 * dir][col])) {
            moves.push({ row: row + 2 * dir, col });
        }
    }

    if (col - 1 >= 0 && row + dir >= 0 && row + dir < 8) {
        if (isEnemy(board[row + dir][col - 1], isWhite)) {
            moves.push({ row: row + dir, col: col - 1 });
        }
    }

    if (col + 1 < 8 && row + dir >= 0 && row + dir < 8) {
        if (isEnemy(board[row + dir][col + 1], isWhite)) {
            moves.push({ row: row + dir, col: col + 1 });
        }
    }

    return moves;
};

const getRookMoves = (board: Board, row: number, col: number, isWhite: boolean): Position[] => {
    const moves: Position[] = [];
    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];

    for (const [dr, dc] of directions) {
        let r = row + dr;
        let c = col + dc;
        while (r >= 0 && r < 8 && c >= 0 && c < 8) {
            if (isEmpty(board[r][c])) {
                moves.push({ row: r, col: c });
            } else {
                if (isEnemy(board[r][c], isWhite)) moves.push({ row: r, col: c });
                break;
            }
            r += dr;
            c += dc;
        }
    }
    return moves;
};

const getKnightMoves = (board: Board, row: number, col: number, isWhite: boolean): Position[] => {
    const moves: Position[] = [];
    const jumps = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];

    for (const [dr, dc] of jumps) {
        const r = row + dr;
        const c = col + dc;
        if (r >= 0 && r < 8 && c >= 0 && c < 8) {
            if (isEmpty(board[r][c]) || isEnemy(board[r][c], isWhite)) {
                moves.push({ row: r, col: c });
            }
        }
    }
    return moves;
};

const getBishopMoves = (board: Board, row: number, col: number, isWhite: boolean): Position[] => {
    const moves: Position[] = [];
    const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

    for (const [dr, dc] of directions) {
        let r = row + dr;
        let c = col + dc;
        while (r >= 0 && r < 8 && c >= 0 && c < 8) {
            if (isEmpty(board[r][c])) {
                moves.push({ row: r, col: c });
            } else {
                if (isEnemy(board[r][c], isWhite)) moves.push({ row: r, col: c });
                break;
            }
            r += dr;
            c += dc;
        }
    }
    return moves;
};

const getQueenMoves = (board: Board, row: number, col: number, isWhite: boolean): Position[] => {
    return [
        ...getRookMoves(board, row, col, isWhite),
        ...getBishopMoves(board, row, col, isWhite),
    ];
};

const getKingMoves = (board: Board, row: number, col: number, isWhite: boolean): Position[] => {
    const moves: Position[] = [];
    const directions = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];

    for (const [dr, dc] of directions) {
        const r = row + dr;
        const c = col + dc;
        if (r >= 0 && r < 8 && c >= 0 && c < 8) {
            if (isEmpty(board[r][c]) || isEnemy(board[r][c], isWhite)) {
                moves.push({ row: r, col: c });
            }
        }
    }
    return moves;
};

const getRawMoves = (board: Board, row: number, col: number): Position[] => {
    const piece = board[row][col];
    if (!piece) return [];
    const isWhite = isWhitePiece(piece);

    switch (piece) {
        case '♙': case '♟': return getPawnMoves(board, row, col, isWhite);
        case '♖': case '♜': return getRookMoves(board, row, col, isWhite);
        case '♘': case '♞': return getKnightMoves(board, row, col, isWhite);
        case '♗': case '♝': return getBishopMoves(board, row, col, isWhite);
        case '♕': case '♛': return getQueenMoves(board, row, col, isWhite);
        case '♔': case '♚': return getKingMoves(board, row, col, isWhite);
        default: return [];
    }
};

// =====================
// ȘAH — DETECTARE
// =====================

const findKing = (board: Board, isWhite: boolean): Position => {
    const king = isWhite ? '♔' : '♚';
    for (let r = 0; r < 8; r++)
        for (let c = 0; c < 8; c++)
            if (board[r][c] === king) return { row: r, col: c };
    return null;
};

const isInCheck = (board: Board, isWhite: boolean): boolean => {
    const kingPos = findKing(board, isWhite);
    if (!kingPos) return false;

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = board[r][c];
            if (!piece) continue;
            if (isWhite ? isWhitePiece(piece) : isBlackPiece(piece)) continue;
            const enemyMoves = getRawMoves(board, r, c);
            if (enemyMoves.some(m => m?.row === kingPos.row && m?.col === kingPos.col)) {
                return true;
            }
        }
    }
    return false;
};

const moveDoesNotLeaveKingInCheck = (
    board: Board, fromRow: number, fromCol: number,
    toRow: number, toCol: number, isWhite: boolean
): boolean => {
    const newBoard = board.map(r => [...r]);
    newBoard[toRow][toCol] = newBoard[fromRow][fromCol];
    newBoard[fromRow][fromCol] = null;
    return !isInCheck(newBoard, isWhite);
};

const getValidMoves = (board: Board, row: number, col: number): Position[] => {
    const piece = board[row][col];
    if (!piece) return [];
    const isWhite = isWhitePiece(piece);

    return getRawMoves(board, row, col).filter(m =>
        m && moveDoesNotLeaveKingInCheck(board, row, col, m.row, m.col, isWhite)
    );
};

const hasAnyMove = (board: Board, isWhite: boolean): boolean => {
    for (let r = 0; r < 8; r++)
        for (let c = 0; c < 8; c++) {
            const piece = board[r][c];
            if (!piece) continue;
            if (isWhite ? !isWhitePiece(piece) : !isBlackPiece(piece)) continue;
            if (getValidMoves(board, r, c).length > 0) return true;
        }
    return false;
};

// =====================
// COMPONENTA SQUARE
// =====================
interface SquareProps {
    piece: Piece;
    isLight: boolean;
    isSelected: boolean;
    isHighlighted: boolean;
    isInCheckSquare: boolean;
    onClick: () => void;
}

const Square: React.FC<SquareProps> = ({ piece, isLight, isSelected, isHighlighted, isInCheckSquare, onClick }) => {
    let className = `square ${isLight ? 'light' : 'dark'}`;
    if (isSelected) className += ' selected';
    if (isHighlighted) className += ' highlighted';
    if (isInCheckSquare) className += ' in-check';

    const pieceClass = piece
        ? (WHITE_PIECES.includes(piece) ? 'piece piece-white' : 'piece piece-black')
        : '';

    return (
        <div className={className} onClick={onClick}>
            {piece && <span className={pieceClass}>{piece}</span>}
        </div>
    );
};

// =====================
// COMPONENTA PRINCIPALĂ
// =====================
const ChessBoard: React.FC = () => {
    const initialBoard: Board = [
        ['♜', '♞', '♝', '♛', '♚', '♝', '♞', '♜'],
        ['♟', '♟', '♟', '♟', '♟', '♟', '♟', '♟'],
        [null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null],
        ['♙', '♙', '♙', '♙', '♙', '♙', '♙', '♙'],
        ['♖', '♘', '♗', '♕', '♔', '♗', '♘', '♖'],
    ];

    const [board, setBoard] = useState<Board>(initialBoard);
    const [selected, setSelected] = useState<Position>(null);
    const [validMoves, setValidMoves] = useState<Position[]>([]);
    const [isWhiteTurn, setIsWhiteTurn] = useState<boolean>(true);
    const [gameStatus, setGameStatus] = useState<string>('');
    const [promotionPending, setPromotionPending] = useState<Position>(null);
    const [gameId, setGameId] = useState<number | null>(null); // ← AICI, înăuntru

    const INITIAL_TIME = 10 * 60;
    const [whiteTime, setWhiteTime] = useState<number>(INITIAL_TIME);
    const [blackTime, setBlackTime] = useState<number>(INITIAL_TIME);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Creăm o partidă nouă la start
    useEffect(() => {
        createGame().then(id => setGameId(id));
    }, []);

    // Cronometru
    useEffect(() => {
        if (gameStatus === 'checkmate' || gameStatus === 'stalemate') {
            if (timerRef.current) clearInterval(timerRef.current);
            return;
        }

        timerRef.current = setInterval(() => {
            if (isWhiteTurn) {
                setWhiteTime(prev => {
                    if (prev <= 1) {
                        clearInterval(timerRef.current!);
                        setGameStatus('checkmate');
                        return 0;
                    }
                    return prev - 1;
                });
            } else {
                setBlackTime(prev => {
                    if (prev <= 1) {
                        clearInterval(timerRef.current!);
                        setGameStatus('checkmate');
                        return 0;
                    }
                    return prev - 1;
                });
            }
        }, 1000);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isWhiteTurn, gameStatus]);

    const handleSquareClick = (row: number, col: number) => {
        if (gameStatus === 'checkmate' || gameStatus === 'stalemate') return;
        if (promotionPending) return;

        const piece = board[row][col];

        if (!selected) {
            if (!piece) return;
            if (isWhiteTurn && !isWhitePiece(piece)) return;
            if (!isWhiteTurn && !isBlackPiece(piece)) return;
            setSelected({ row, col });
            setValidMoves(getValidMoves(board, row, col));
            return;
        }

        if (piece && (isWhiteTurn ? isWhitePiece(piece) : isBlackPiece(piece))) {
            setSelected({ row, col });
            setValidMoves(getValidMoves(board, row, col));
            return;
        }

        const isValid = validMoves.some(m => m?.row === row && m?.col === col);
        if (!isValid) {
            setSelected(null);
            setValidMoves([]);
            return;
        }

        // Salvăm mutarea în backend
        if (gameId && selected) {
            const movingPiece = board[selected.row][selected.col] ?? '?';
            const from = toChessNotation(selected.row, selected.col);
            const to = toChessNotation(row, col);
            const player = isWhiteTurn ? 'white' : 'black';
            saveMove(gameId, movingPiece, from, to, player);
        }

        const newBoard = board.map(r => [...r]);
        newBoard[row][col] = board[selected.row][selected.col];
        newBoard[selected.row][selected.col] = null;

        setSelected(null);
        setValidMoves([]);

        const movedPiece = newBoard[row][col];
        if ((movedPiece === '♙' && row === 0) || (movedPiece === '♟' && row === 7)) {
            setBoard(newBoard);
            setPromotionPending({ row, col });
            return;
        }

        updateGameState(newBoard, !isWhiteTurn);
    };

    const handlePromotion = (piece: string) => {
        if (!promotionPending) return;
        const newBoard = board.map(r => [...r]);
        newBoard[promotionPending.row][promotionPending.col] = piece;
        setPromotionPending(null);
        updateGameState(newBoard, !isWhiteTurn);
    };

    const updateGameState = (newBoard: Board, nextIsWhite: boolean) => {
        setBoard(newBoard);
        setIsWhiteTurn(nextIsWhite);

        const inCheck = isInCheck(newBoard, nextIsWhite);
        const hasMoves = hasAnyMove(newBoard, nextIsWhite);

        if (inCheck && !hasMoves) {
            setGameStatus('checkmate');
            if (gameId) finishGame(gameId, nextIsWhite ? 'black' : 'white');
        } else if (!inCheck && !hasMoves) {
            setGameStatus('stalemate');
            if (gameId) finishGame(gameId, 'draw');
        } else if (inCheck) {
            setGameStatus('check');
        } else {
            setGameStatus('');
        }
    };

    const resetGame = () => {
        setBoard(initialBoard);
        setSelected(null);
        setValidMoves([]);
        setIsWhiteTurn(true);
        setGameStatus('');
        setPromotionPending(null);
        setWhiteTime(INITIAL_TIME);
        setBlackTime(INITIAL_TIME);
        createGame().then(id => setGameId(id));
    };

    const handleAIMove = (fromRow: number, fromCol: number, toRow: number, toCol: number): boolean => {
        const piece = board[fromRow][fromCol];
        if (!piece) return false;
        if (isWhiteTurn && !isWhitePiece(piece)) return false;
        if (!isWhiteTurn && !isBlackPiece(piece)) return false;

        const moves = getValidMoves(board, fromRow, fromCol);
        const isValid = moves.some(m => m?.row === toRow && m?.col === toCol);
        if (!isValid) return false;

        if (gameId) {
            const from = toChessNotation(fromRow, fromCol);
            const to = toChessNotation(toRow, toCol);
            const player = isWhiteTurn ? 'white' : 'black';
            saveMove(gameId, piece, from, to, player);
        }

        const newBoard = board.map(r => [...r]);
        newBoard[toRow][toCol] = board[fromRow][fromCol];
        newBoard[fromRow][fromCol] = null;

        const movedPiece = newBoard[toRow][toCol];
        if ((movedPiece === '♙' && toRow === 0) || (movedPiece === '♟' && toRow === 7)) {
            newBoard[toRow][toCol] = isWhiteTurn ? '♕' : '♛';
        }

        updateGameState(newBoard, !isWhiteTurn);
        return true;
    };

    const kingInCheckPos = gameStatus === 'check' || gameStatus === 'checkmate'
        ? findKing(board, isWhiteTurn)
        : null;

    const promotionPieces = isWhiteTurn
        ? ['♕', '♖', '♗', '♘']
        : ['♛', '♜', '♝', '♞'];

    const gameOver = gameStatus === 'checkmate' || gameStatus === 'stalemate';

    return (
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', minHeight: '100vh', background: '#1e1e1e', paddingTop: '30px', gap: '20px' }}>

            <div className="chess-container" style={{ minHeight: 'unset' }}>
                <h1>♟️ ITP Chess Trainee 2026</h1>
                <p className="subtitle">Program Trainee - IT Perspectives</p>

                <div className={`turn-indicator ${gameStatus === 'check' ? 'in-check-indicator' : ''} ${gameOver ? 'game-over-indicator' : ''}`}>
                    {gameStatus === 'checkmate' && `🏆 Șah mat! Câștigă ${!isWhiteTurn ? 'Albele ⬜' : 'Negrele ⬛'}`}
                    {gameStatus === 'stalemate' && '🤝 Pat! Remiză!'}
                    {gameStatus === 'check' && `⚠️ Șah! ${isWhiteTurn ? 'Albele ⬜' : 'Negrele ⬛'} sunt în pericol!`}
                    {gameStatus === '' && (isWhiteTurn ? '⬜ Rândul albelor' : '⬛ Rândul negrelor')}
                </div>

                <div className="timers-container">
                    <ChessTimer
                        timeLeft={blackTime}
                        isActive={!isWhiteTurn && !gameOver}
                        label="Negre ⬛"
                        isWhite={false}
                    />
                    <ChessTimer
                        timeLeft={whiteTime}
                        isActive={isWhiteTurn && !gameOver}
                        label="Albe ⬜"
                        isWhite={true}
                    />
                </div>

                {/* Tablă cu etichete */}
                <div className="board-wrapper">
                    <div className="board-with-labels">

                        {/* Etichete rânduri 8-1 */}
                        <div className="row-labels">
                            {['8', '7', '6', '5', '4', '3', '2', '1'].map(r => (
                                <div key={r} className="row-label">{r}</div>
                            ))}
                        </div>

                        {/* Tabla */}
                        <div className="board">
                            {board.map((rowArr, rowIndex) =>
                                rowArr.map((piece, colIndex) => {
                                    const isLight = (rowIndex + colIndex) % 2 === 0;
                                    const isSelected = selected?.row === rowIndex && selected?.col === colIndex;
                                    const isHighlighted = validMoves.some(m => m?.row === rowIndex && m?.col === colIndex);
                                    const isInCheckSquare = kingInCheckPos?.row === rowIndex && kingInCheckPos?.col === colIndex;

                                    return (
                                        <Square
                                            key={`${rowIndex}-${colIndex}`}
                                            piece={piece}
                                            isLight={isLight}
                                            isSelected={isSelected}
                                            isHighlighted={isHighlighted}
                                            isInCheckSquare={isInCheckSquare}
                                            onClick={() => handleSquareClick(rowIndex, colIndex)}
                                        />
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Etichete coloane a-h */}
                    <div className="col-labels">
                        {['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map(c => (
                            <div key={c} className="col-label">{c}</div>
                        ))}
                    </div>
                </div>

                {promotionPending && (
                    <div className="promotion-modal">
                        <p>Alege piesa pentru promovare:</p>
                        <div className="promotion-choices">
                            {promotionPieces.map(p => (
                                <button key={p} className="promotion-btn" onClick={() => handlePromotion(p)}>
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <button className="reset-btn" onClick={resetGame}>
                    🔄 Joc nou
                </button>

                <div className="info">
                    {selected
                        ? `Piesă selectată la (${selected.row}, ${selected.col}) — ${validMoves.length} mutări posibile`
                        : 'Selectează o piesă pentru a o muta'}
                </div>
            </div>

            <ChatPanel
                board={board}
                isWhiteTurn={isWhiteTurn}
                onMove={handleAIMove}
                gameStatus={gameStatus}
            />

        </div>
    );
};

export default ChessBoard;