var builder = WebApplication.CreateBuilder(args);

// Add service defaults & Aspire client integrations.
builder.AddServiceDefaults();

// Add services to the container.
builder.Services.AddProblemDetails();
builder.Services.AddOpenApi();

// CORS — permite frontend-ului să comunice cu backend-ul
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins("http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

app.UseExceptionHandler();
app.UseCors("AllowFrontend");

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

// =====================
// DATE — stocăm în memorie (simplu, fără bază de date)
// =====================
var games = new List<GameRecord>();
var moves = new List<MoveRecord>();
int gameIdCounter = 1;
int moveIdCounter = 1;

var api = app.MapGroup("/api");

// =====================
// GAMES — creare și listare partide
// =====================

// GET /api/games — toate partidele
api.MapGet("games", () => Results.Ok(games));

// POST /api/games — creează o partidă nouă
api.MapPost("games", () =>
{
    var game = new GameRecord(
        Id: gameIdCounter++,
        StartedAt: DateTime.Now,
        Status: "in_progress"
    );
    games.Add(game);
    return Results.Ok(game);
});

// PUT /api/games/{id}/finish — termină o partidă
api.MapPut("games/{id}/finish", (int id, FinishGameRequest req) =>
{
    var game = games.FirstOrDefault(g => g.Id == id);
    if (game == null) return Results.NotFound();

    games.Remove(game);
    var updated = game with { Status = req.Winner };
    games.Add(updated);
    return Results.Ok(updated);
});

// =====================
// MOVES — salvare și listare mutări
// =====================

// GET /api/games/{id}/moves — mutările unei partide
api.MapGet("games/{id}/moves", (int id) =>
{
    var gameMoves = moves.Where(m => m.GameId == id).OrderBy(m => m.MoveNumber).ToList();
    return Results.Ok(gameMoves);
});

// POST /api/games/{id}/moves — salvează o mutare
api.MapPost("games/{id}/moves", (int id, MoveRequest req) =>
{
    var game = games.FirstOrDefault(g => g.Id == id);
    if (game == null) return Results.NotFound();

    var moveNumber = moves.Count(m => m.GameId == id) + 1;
    var move = new MoveRecord(
        Id: moveIdCounter++,
        GameId: id,
        MoveNumber: moveNumber,
        Piece: req.Piece,
        From: req.From,
        To: req.To,
        Player: req.Player,
        Timestamp: DateTime.Now
    );
    moves.Add(move);
    return Results.Ok(move);
});

app.MapDefaultEndpoints();
app.UseFileServer();
app.Run();

// =====================
// MODELE
// =====================
record GameRecord(int Id, DateTime StartedAt, string Status);
record MoveRecord(int Id, int GameId, int MoveNumber, string Piece, string From, string To, string Player, DateTime Timestamp);
record MoveRequest(string Piece, string From, string To, string Player);
record FinishGameRequest(string Winner);