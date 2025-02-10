const express = require('express');
const connection = require('./db'); // Importiere die MySQL-Verbindung
const app = express();
const bcrypt = require('bcrypt');
const session = require('express-session'); // Für Session-Handling
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Wichtig für POST-Requests mit Formulardaten

// Session einrichten
app.use(session({
    secret: 'geheimes_sitzungsgeheimnis', // Ändere das für Sicherheit
    resave: false,
    saveUninitialized: true
}));



// EJS als Template-Engine verwenden
app.set('view engine', 'ejs');

// Statische Dateien (CSS, JS) einbinden
app.use(express.static('public'));

// Route für die Anmeldung-Seite
app.get('/anmeldung', (req, res) => {
    res.render('anmeldung');
});
// **POST-Route für Login**
app.post('/anmeldung', (req, res) => {
    const { spielername, passwort } = req.body;

    if (!spielername || !passwort) {
        return res.render('anmeldung', { error: 'Bitte alle Felder ausfüllen!' });
    }

    // Nutzer in der Datenbank suchen (E-Mail oder Spielername)
    const sql = 'SELECT * FROM spieler WHERE spielername = ? OR mail = ?';
    connection.query(sql, [spielername, spielername], async (err, results) => {
        if (err) {
            console.error('Fehler bei der Datenbankabfrage:', err);
            return res.status(500).send('Serverfehler');
        }

        if (results.length === 0) {
            return res.render('login', { error: 'Benutzer nicht gefunden!' });
        }

        const benutzer = results[0];

        // Passwort überprüfen
        const passwortKorrekt = await bcrypt.compare(passwort, benutzer.passwort);
        if (!passwortKorrekt) {
            return res.render('login', { error: 'Falsches Passwort!' });
        }

        // Session speichern
        req.session.spieler = {
            id: benutzer.id,
            spielername: benutzer.spielername,
            mail: benutzer.mail
        };

        console.log('Login erfolgreich:', req.session.spieler);
        res.redirect('/index'); // Erfolgreich eingeloggt -> Weiterleitung
    });
});



// Route für die Turnier-Seite
app.get('/turnier', (req, res) => {
    res.render('turnier');
});

// Route für die Registrierung-Seite
app.get('/registrierung', (req, res) => {
        res.render('registrierung');
});

// **POST-Route für neuen Benutzer**
app.post('/register', async (req, res) => {
    const { vorname, nachname, spielername, mail, passwort } = req.body;
    const elo = 0;

    if (!vorname || !nachname || !mail || !passwort) {
        return res.status(400).send('Bitte alle Felder ausfüllen!');
    }

    try {
        const salt = await bcrypt.genSalt(10); // Salz für Hashing generieren
        const hashedPasswort = await bcrypt.hash(passwort, salt); // Passwort hashen

        const neuerBenutzer = { vorname, nachname, spielername, mail, passwort: hashedPasswort,elo };

        connection.query('INSERT INTO spieler SET ?', neuerBenutzer, (err, results) => {
            if (err) {
                console.error('Fehler beim Einfügen:', err);
                return res.status(500).send('Fehler beim Speichern des Benutzers');
            }
            console.log('Neuer Benutzer hinzugefügt, ID:', results.insertId);
            res.redirect('/login'); // Weiterleitung zur Login-Seite
        });

    } catch (error) {
        console.error('Fehler beim Hashen des Passworts:', error);
        res.status(500).send('Serverfehler');
    }
});

// Route für die Spieler-Seite
app.get('/spieler', (req, res) => {
    connection.query('SELECT * FROM spieler', (err, results) => {
        if (err) {
            console.error('Fehler bei der Abfrage:', err);
            res.status(500).send('Fehler bei der Datenbankabfrage');
            return;
        }
        res.render('spieler', { spieler: results });
    });
});

// Server starten
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server läuft auf http://localhost:${PORT} 🚀`);
});
