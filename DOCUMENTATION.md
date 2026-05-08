# Documentație tehnică și funcțională
# ITP Chess Trainee 2026

## 1. Documentație funcțională

### 1.1 Descrierea aplicației

ITP Chess Trainee 2026 este o aplicație web de șah cu două componente principale:
- **Jocul de șah** — doi jucători pe același calculator
- **AI Chess Assistant** — chat prin care jucătorul poate dicta mutări în limbaj natural

### 1.2 Cum se joacă

**Mutare manuală:**
1. Click pe o piesă pentru a o selecta (se evidențiază în galben)
2. Punctele verzi arată mutările valide disponibile
3. Click pe destinație pentru a muta piesa

**Mutare prin AI Chat:**
1. Scrie în chat mutarea dorită: `e2 e4` sau `mută pionul din e2 în e4`
2. AI-ul interpretează comanda și execută mutarea
3. Dacă mutarea nu e validă, primești un mesaj de eroare

### 1.3 Notația șah

Tabla are coordonate standard:
- **Coloane:** a, b, c, d, e, f, g, h (stânga → dreapta)
- **Rânduri:** 1-8 (jos → sus)
- Exemplu: `e2` = coloana e, rândul 2

### 1.4 Reguli implementate

- **Pion:** mișcare 1 sau 2 pași înainte din poziția inițială, captură diagonală, promovare la capătul tablei
- **Turn:** mișcare pe linii și coloane, oricâte pătrățele
- **Cal:** mișcare în L (2+1 pătrățele), poate sări peste alte piese
- **Nebun:** mișcare diagonală, oricâte pătrățele
- **Regină:** combină Turn + Nebun
- **Rege:** un pătrățel în orice direcție
- **Șah:** regele atacat se evidențiază în roșu
- **Șah mat:** jocul se oprește, apare câștigătorul
- **Pat:** remiză când nu mai există mutări valide
- **Promovare:** pionul ajuns la capăt se transformă în Regina/Turn/Nebun/Cal

### 1.5 Cronometru

- Fiecare jucător are 10 minute
- Cronometrul jucătorului activ scade
- Sub 30 secunde — cronometrul clipește roșu
- La 0 secunde — jucătorul pierde

---

## 2. Documentație tehnică

### 2.1 Arhitectura aplicației

```
Browser (React)  ←→  ASP.NET Core API  ←→  In-Memory Storage
↕
OpenRouter API (AI)
```

### 2.2 Frontend — React + TypeScript

#### Componente principale

**ChessBoard.tsx**
- Componenta centrală a aplicației
- Gestionează starea completă a jocului (board, selected, validMoves, gameStatus)
- Implementează logica de mutare pentru toate piesele
- Detectează șah, șah mat și pat
- Comunică cu backend-ul prin chessApi.ts

**State management:**
```typescript
const [board, setBoard] = useState<Board>(initialBoard);
const [selected, setSelected] = useState<Position>(null);
const [validMoves, setValidMoves] = useState<Position[]>([]);
const [isWhiteTurn, setIsWhiteTurn] = useState<boolean>(true);
const [gameStatus, setGameStatus] = useState<string>('');
const [gameId, setGameId] = useState<number | null>(null);
```

**ChessTimer.tsx**
- Componentă pură de display
- Primește timeLeft și isActive ca props
- Animație de clipire când timpul e critic

**ChatPanel.tsx**
- Interfața de chat cu AI
- Trimite starea tablei + comanda utilizatorului către OpenRouter API
- Sistem de fallback în 3 niveluri:
  1. Parsare JSON din răspunsul AI
  2. Extragere coordonate din text AI
  3. Parsare directă din textul utilizatorului (ex: "e2 e4")

**chessApi.ts**
- Serviciu pentru comunicarea cu backend-ul
- Funcții: createGame, saveMove, finishGame, toChessNotation

#### Algoritmul de validare mutări

```
getRawMoves() → toate mutările posibile geometric
↓
moveDoesNotLeaveKingInCheck() → filtrăm mutările care lasă regele în șah
↓
getValidMoves() → mutările finale valide
```

#### Detectarea șahului

```
isInCheck(board, isWhite):
  1.Găsim poziția regelui
  2.Parcurgem toate piesele adversare
  3.Verificăm dacă vreo piesă poate ataca regele
  4.Return true/false
```

### 2.3 Backend — ASP.NET Core

#### Endpoints

```
POST /api/games
→ Creează o partidă nouă
→ Return: { id, startedAt, status }
GET /api/games
→ Returnează toate partidele
→ Return: GameRecord[]
PUT /api/games/{id}/finish
→ Body: { winner: "white"/"black"/"draw" }
→ Marchează sfârșitul partidei
POST /api/games/{id}/moves
→ Body: { piece, from, to, player }
→ Salvează o mutare în istoric
GET /api/games/{id}/moves
→ Returnează istoricul mutărilor unei partide
```

#### Modele de date

```csharp
record GameRecord(int Id, DateTime StartedAt, string Status);
record MoveRecord(int Id, int GameId, int MoveNumber, 
                  string Piece, string From, string To, 
                  string Player, DateTime Timestamp);
```

#### Stocare

Datele sunt stocate în memorie (List<T>) — soluție simplă și rapidă pentru un proiect demo. Pentru producție s-ar folosi o bază de date (SQL Server, PostgreSQL).

### 2.4 AI Integration

**Provider:** OpenRouter API  
**Model:** NVIDIA Nemotron 3 Super 120B  
**Abordare:** 
1. Se trimite starea tablei în format text + comanda utilizatorului
2. AI-ul returnează JSON cu coordonatele mutării
3. Se validează mutarea conform regulilor șahului
4. Se execută mutarea pe tablă

### 2.5 Securitate

- Cheia API este stocată în `.env` (exclus din git prin `.gitignore`)
- CORS configurat să accepte doar originea frontend-ului

---

## 3. Provocări întâlnite și soluții

### Problema 1 — Mutările care lasă regele în șah
**Obstacol:** Inițial, jucătorul putea face mutări care lăsau propriul rege în șah, ceea ce e invalid în șah.  
**Soluție:** Am implementat funcția `moveDoesNotLeaveKingInCheck` care simulează fiecare mutare pe o copie a tablei și verifică dacă regele rămâne în șah după mutare.

### Problema 2 — AI-ul nu returna JSON valid
**Obstacol:** Modelul AI răspundea cu text explicativ în loc de JSON pur, cauzând erori de parsare.  
**Soluție:** Am implementat un sistem de fallback în 3 niveluri — parsare JSON, extragere din text, și parsare directă din inputul utilizatorului.

### Problema 3 — Rate limiting API Gemini
**Obstacol:** Google Gemini API avea limite de 0 cereri pe free tier, blocând complet funcționalitatea AI.  
**Soluție:** Am migrat la OpenRouter API care oferă acces la modele gratuite fără restricții severe.
