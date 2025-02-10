const connection = require('./db'); // Falls du die Verbindung in db.js definiert hast

connection.query('SELECT * FROM spieler', (err, results) => {
    if (err) {
        console.error('Fehler bei der Abfrage:', err);
        return;
    }
    console.log('Spieler:', results);
});
