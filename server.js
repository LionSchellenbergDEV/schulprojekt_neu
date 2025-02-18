const express = require('express');
const connection = require('./db'); // Importiere die MySQL-Verbindung
const app = express();
const bcrypt = require('bcrypt');
const session = require('express-session'); // Für Session-Handling
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Wichtig für POST-Requests mit Formulardaten
const path = require('path');

// Standard-Views (öffentliche Seiten)
app.set('views', path.join(__dirname, 'views'));



function isAuthenticated(req, res, next) {
    if (req.session && req.session.spieler) {
        return next(); // Nutzer ist eingeloggt, fahre fort
    }
    res.redirect('/anmeldung'); // Falls nicht eingeloggt, zur Anmeldung weiterleiten
}

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
            id: benutzer.nutzer_id,
            spielername: benutzer.spielername,
            mail: benutzer.mail
        };

        // Session-Cookie mit einer Ablaufzeit von 7 Tagen setzen
        req.session.cookie.maxAge = 7 * 24 * 60 * 60 * 1000; // 7 Tage in Millisekunden


        console.log('Login erfolgreich:', req.session.spieler);
        res.redirect('/spieler');// Erfolgreich eingeloggt -> Weiterleitung
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
            res.redirect('/protected views/index'); // Weiterleitung zur Login-Seite
        });

    } catch (error) {
        console.error('Fehler beim Hashen des Passworts:', error);
        res.status(500).send('Serverfehler');
    }
});

// Route für die Spieler-Seite
app.get('/spieler', isAuthenticated,(req, res) => {

    const user_id = req.session.spieler.id;
    connection.query("SELECT * FROM spieler WHERE nutzer_id =?",[user_id], (err, results) => {
        if (err) {
            console.error('Fehler bei der Abfrage:', err);
            res.status(500).send('Fehler bei der Datenbankabfrage');
            return;
        }
        res.render("protected views\\spieler", { spieler: results });
    });
});

app.post('/spielerdaten-aktualisieren', isAuthenticated,(req, res) => {
    const nachname = req.body.nachname;
    const mail = req.body.mail;
    const user_id = req.session.spieler.id;  // ID des zu aktualisierenden Datensatzes

    const sql = "UPDATE spieler SET nachname = ?, mail = ? WHERE nutzer_id = ?";
    const values = [nachname, mail, user_id];

    connection.query(sql, values, (err, result) => {
        if (err) {
            console.error('Fehler beim Update:', err);
            return;
        } else {
            res.redirect("/spieler");
        }
    });
});

// Server starten
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server läuft auf http://localhost:${PORT} 🚀`);
});
