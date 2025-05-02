const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');
const path = require('path');
const app = express();
const PORT = 3000;

const db = new sqlite3.Database('./messages.db', (err) => {
  if (err) return console.error("DB Fehler:", err);
  console.log("✅ SQLite verbunden");
});

db.run(`CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  message TEXT NOT NULL,
  creatorIP TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);`);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.post('/create', (req, res) => {
  const { message, ip } = req.body;
  const id = crypto.randomBytes(15).toString('hex');

  db.run(
    'INSERT INTO messages (id, message, creatorIP) VALUES (?, ?, ?)',
    [id, message, ip],
    function (err) {
      if (err) {
        console.error("Fehler beim Einfügen:", err);
        return res.status(500).json({ error: 'DB-Fehler' });
      }
      res.json({ url: `/message/${id}` });
    }
  );
});

app.get('/message/:id', (req, res) => {
  const id = req.params.id;
  const userIP = req.ip;

  db.get('SELECT * FROM messages WHERE id = ?', [id], (err, row) => {
    if (err || !row) {
      return res.send("Error: URL Exestiert nicht mehr.");
    }

    if (row.creatorIP === userIP) {
      return res.send("📝 Du kannst deine eigene Nachricht nicht lesen.");
    }

    db.run('DELETE FROM messages WHERE id = ?', [id], (err) => {
      if (err) console.error("Fehler beim Löschen:", err);
    });

    res.send(`
      <!DOCTYPE html>
      <html lang="de">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Einmalige Nachricht</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #1e1e1e;
            color: #f0f0f0;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            padding: 1rem;
          }
          .container {
            max-width: 600px;
            width: 100%;
            background: #2c2c2c;
            padding: 2rem;
            border-radius: 12px;
            box-shadow: 0 0 10px rgba(0,0,0,0.5);
            text-align: center;
          }
          .message-box {
            background: #444;
            padding: 1rem;
            border-radius: 8px;
            word-wrap: break-word;
            white-space: pre-wrap;
            margin: 1rem 0;
          }
          .info {
            color: #ffa500;
            font-size: 0.9rem;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>📩 Einmalige Nachricht</h2>
          <p>Wenn du auf dieser Seite gelandet bist beduetet es das du eine Temp Nachricht bekommen hast! Diese Nachricht kannst du nur einmal Ansehen.</p>
          <div class="message-box">${row.message}</div>
          <div class="info">Diese Nachricht wurde nun gelöscht.</div>
        </div>
      </body>
      </html>
    `);
    
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server läuft auf http://localhost:${PORT}`);
});
