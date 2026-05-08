# ♟️ ITP Chess Trainee 2026

Aplicație modernă de șah dezvoltată ca proiect tehnic pentru programul Trainee 2026 - IT Perspectives.

## Tehnologii folosite

- **Frontend:** React + TypeScript + Vite
- **Backend:** ASP.NET Core (.NET 9)
- **Orchestrator:** .NET Aspire
- **AI:** OpenRouter API (NVIDIA Nemotron)
- **Stilizare:** CSS custom

## Funcționalități implementate

- Tablă de șah complet funcțională cu piese Unicode
- Logică completă pentru toate piesele (Pion, Turn, Cal, Nebun, Regină, Rege)
- Detectare șah, șah mat și pat
- Promovare pion cu selecție interactivă
- Sistem de cronometrare per jucător (10 minute/jucător)
- Animații la mutarea pieselor
- AI Chess Assistant — mutări prin chat în limbaj natural
- Etichete pe tablă (a-h, 1-8) pentru orientare
- Backend ASP.NET Core pentru salvarea istoricului mutărilor
- Buton reset pentru joc nou

## Cum rulezi proiectul

### Cerințe
- Node.js 
- .NET 9 SDK
- Visual Studio 2026

### Pași

1. Clonează repository-ul:
   git clone https://github.com/username/SahApp2k26.git
2. Setează cheia API în frontend/.env:
   VITE_AI_API_KEY=cheia_ta_openrouter
3. Rulează din Visual Studio cu F5 (startup project: SahApp2k26.AppHost)
4. Sau rulează separat:

Frontend
cd frontend
npm install
npm run dev
Backend
cd SahApp2k26.Server
dotnet run

5. Deschide `http://localhost:5173`

## Structura proiectului

```
SahApp2k26/
├── frontend/                    # React + TypeScript
│   └── src/
│       ├── ChessBoard.tsx       # Componenta principală + logica jocului
│       ├── ChessBoard.css       # Stilizare tablă și piese
│       ├── ChessTimer.tsx       # Componenta cronometru
│       ├── ChessTimer.css       # Stilizare cronometru
│       ├── ChatPanel.tsx        # AI Chess Assistant
│       ├── ChatPanel.css        # Stilizare chat
│       └── chessApi.ts          # Serviciu comunicare backend
├── SahApp2k26.Server/           # ASP.NET Core backend
│   └── Program.cs               # API endpoints
└── SahApp2k26.AppHost/          # .NET Aspire orchestrator
```

## API Endpoints

| Method | Endpoint | Descriere |
|--------|----------|-----------|
| GET | /api/games | Lista toate partidele |
| POST | /api/games | Creează o partidă nouă |
| PUT | /api/games/{id}/finish | Termină o partidă |
| GET | /api/games/{id}/moves | Mutările unei partide |
| POST | /api/games/{id}/moves | Salvează o mutare |
