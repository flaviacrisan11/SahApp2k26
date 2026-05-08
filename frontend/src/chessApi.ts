// =====================
// API SERVICE — comunicare cu backend-ul
// =====================

const API_BASE = 'http://localhost:5000/api';

export interface GameRecord {
    id: number;
    startedAt: string;
    status: string;
}

export interface MoveRecord {
    id: number;
    gameId: number;
    moveNumber: number;
    piece: string;
    from: string;
    to: string;
    player: string;
    timestamp: string;
}

// Creează o partidă nouă și returnează ID-ul
export const createGame = async (): Promise<number> => {
    const response = await fetch(`${API_BASE}/games`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    });
    const game: GameRecord = await response.json();
    return game.id;
};

// Salvează o mutare
export const saveMove = async (
    gameId: number,
    piece: string,
    from: string,
    to: string,
    player: 'white' | 'black'
): Promise<void> => {
    await fetch(`${API_BASE}/games/${gameId}/moves`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ piece, from, to, player })
    });
};

// Termină o partidă
export const finishGame = async (
    gameId: number,
    winner: string
): Promise<void> => {
    await fetch(`${API_BASE}/games/${gameId}/finish`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ winner })
    });
};

// Convertim coordonate row/col în notație șah (ex: 6,4 → e2)
export const toChessNotation = (row: number, col: number): string => {
    const cols = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const rows = ['8', '7', '6', '5', '4', '3', '2', '1'];
    return `${cols[col]}${rows[row]}`;
};