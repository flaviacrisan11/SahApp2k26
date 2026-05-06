import React, { useState, useRef, useEffect } from 'react';
import './ChatPanel.css';

interface Message {
    role: 'user' | 'ai' | 'error';
    text: string;
}

interface MoveResult {
    success: boolean;
    fromRow: number;
    fromCol: number;
    toRow: number;
    toCol: number;
    message: string;
}

interface ChatPanelProps {
    board: (string | null)[][];
    isWhiteTurn: boolean;
    onMove: (fromRow: number, fromCol: number, toRow: number, toCol: number) => boolean;
    gameStatus: string;
}

const OPENROUTER_API_KEY = import.meta.env.VITE_AI_API_KEY;
const AI_URL = 'https://openrouter.ai/api/v1/chat/completions';

const COL_MAP: Record<string, number> = { a: 0, b: 1, c: 2, d: 3, e: 4, f: 5, g: 6, h: 7 };
const ROW_MAP: Record<string, number> = { '8': 0, '7': 1, '6': 2, '5': 3, '4': 4, '3': 5, '2': 6, '1': 7 };

const boardToText = (board: (string | null)[][]): string => {
    let text = 'Current board state (row 8 = top, row 1 = bottom):\n';
    text += '  a  b  c  d  e  f  g  h\n';
    for (let r = 0; r < 8; r++) {
        const rankNumber = 8 - r;
        text += `${rankNumber} `;
        for (let c = 0; c < 8; c++) {
            text += (board[r][c] ?? '·') + '  ';
        }
        text += `${rankNumber}\n`;
    }
    text += '  a  b  c  d  e  f  g  h\n';
    return text;
};

// Parsează direct din textul utilizatorului ex: "e2 e4" sau "e2 în e4"
const parseFromUserText = (text: string): MoveResult | null => {
    const match = text.match(/([a-h])([1-8])[^\w]*([a-h])([1-8])/i);
    if (!match) return null;
    return {
        success: true,
        fromRow: ROW_MAP[match[2]],
        fromCol: COL_MAP[match[1].toLowerCase()],
        toRow: ROW_MAP[match[4]],
        toCol: COL_MAP[match[3].toLowerCase()],
        message: `Mutare ${match[1]}${match[2]} → ${match[3]}${match[4]}`
    };
};

const ChatPanel: React.FC<ChatPanelProps> = ({ board, isWhiteTurn, onMove, gameStatus }) => {
    const [messages, setMessages] = useState<Message[]>([
        {
            role: 'ai',
            text: '👋 Salut! Îți pot executa mutări în șah. Scrie ceva de genul: "mută pionul din e2 în e4" sau "du calul în f3".'
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendMessage = async () => {
        if (!input.trim() || isLoading) return;
        if (gameStatus === 'checkmate' || gameStatus === 'stalemate') {
            setMessages(prev => [...prev, {
                role: 'error',
                text: 'Jocul s-a terminat! Apasă "Joc nou" pentru a începe din nou.'
            }]);
            return;
        }

        const userMessage = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
        setIsLoading(true);

        try {
            // Încercăm mai întâi să parsăm direct din textul utilizatorului
            const directParse = parseFromUserText(userMessage);

            const prompt = `You are a chess assistant. Analyze the board and return ONLY a JSON object, nothing else.

${boardToText(board)}

Current turn: ${isWhiteTurn ? 'WHITE (♙♖♘♗♕♔)' : 'BLACK (♟♜♞♝♛♚)'}

User request: "${userMessage}"

Column notation: a=0, b=1, c=2, d=3, e=4, f=5, g=6, h=7
Row notation: 8=0, 7=1, 6=2, 5=3, 4=4, 3=5, 2=6, 1=7

Respond with ONLY this JSON, no other text, no markdown, no explanation:
{"success":true,"fromRow":6,"fromCol":4,"toRow":4,"toCol":4,"message":"Pion e2 mutat în e4"}

If unclear, respond with ONLY:
{"success":false,"fromRow":0,"fromCol":0,"toRow":0,"toCol":0,"message":"explanation in Romanian"}`;

            const response = await fetch(AI_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                },
                body: JSON.stringify({
                    model: 'nvidia/nemotron-3-super-120b-a12b:free',
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a chess move parser. You ONLY respond with valid JSON objects. Never add explanations or markdown.'
                        },
                        { role: 'user', content: prompt }
                    ],
                    max_tokens: 400,
                })
            });

            if (!response.ok) {
                const errorBody = await response.json();
                console.error('API error details:', JSON.stringify(errorBody));
                throw new Error(`API Error: ${response.status}`);
            }

            const data = await response.json();
            const rawText = data.choices?.[0]?.message?.content ?? '';
            console.log('AI raw response:', rawText);

            let result: MoveResult;

            // 1. Încercăm JSON din răspunsul AI
            const jsonMatch = rawText.match(/\{[\s\S]*?\}/);
            if (jsonMatch) {
                result = JSON.parse(jsonMatch[0]);
            }
            // 2. Extragem coordonate din răspunsul AI (text)
            else {
                const fromRowMatch = rawText.match(/fromRow[:\s]+(\d)/);
                const fromColMatch = rawText.match(/fromCol[:\s]+(\d)/);
                const toRowMatch = rawText.match(/toRow[:\s]+(\d)/);
                const toColMatch = rawText.match(/toCol[:\s]+(\d)/);

                if (fromRowMatch && fromColMatch && toRowMatch && toColMatch) {
                    result = {
                        success: true,
                        fromRow: parseInt(fromRowMatch[1]),
                        fromCol: parseInt(fromColMatch[1]),
                        toRow: parseInt(toRowMatch[1]),
                        toCol: parseInt(toColMatch[1]),
                        message: 'Mutare executată de AI'
                    };
                }
                // 3. Fallback — parsăm direct din textul utilizatorului
                else if (directParse) {
                    result = directParse;
                }
                else {
                    throw new Error('Nu am putut înțelege mutarea. Încearcă format: "e2 e4"');
                }
            }

            if (!result.success) {
                setMessages(prev => [...prev, { role: 'ai', text: `❌ ${result.message}` }]);
            } else {
                const moveOk = onMove(result.fromRow, result.fromCol, result.toRow, result.toCol);
                if (moveOk) {
                    setMessages(prev => [...prev, { role: 'ai', text: `✅ ${result.message}` }]);
                } else {
                    setMessages(prev => [...prev, {
                        role: 'ai',
                        text: '❌ Mutarea nu e validă conform regulilor șahului. Încearcă altceva!'
                    }]);
                }
            }
        } catch (err) {
            console.error(err);
            setMessages(prev => [...prev, {
                role: 'error',
                text: `⚠️ ${err instanceof Error ? err.message : 'Eroare necunoscută'}`
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') sendMessage();
    };

    return (
        <div className="chat-panel">
            <div className="chat-header">🤖 AI Chess Assistant</div>

            <div className="chat-messages">
                {messages.map((msg, i) => (
                    <div key={i} className={`chat-message ${msg.role}`}>
                        {msg.text}
                    </div>
                ))}
                {isLoading && (
                    <div className="chat-loading">
                        <span /><span /><span />
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="chat-input-area">
                <input
                    className="chat-input"
                    type="text"
                    placeholder="Ex: e2 e4 sau mută pionul din e2 în e4..."
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isLoading}
                />
                <button
                    className="chat-send-btn"
                    onClick={sendMessage}
                    disabled={isLoading}
                >
                    ➤
                </button>
            </div>
        </div>
    );
};

export default ChatPanel;