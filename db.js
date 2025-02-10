const mysql = require('mysql2');

const connection = mysql.createConnection({
    host: 'localhost',      // oder '127.0.0.1'
    user: 'root',           // MAMP Standardbenutzer
    password: 'root',       // MAMP Standardpasswort
    database: 'schulprojekt' // Deine Datenbank
});

connection.connect(err => {
    if (err) {
        console.error('Fehler bei der Verbindung:', err);
        return;
    }
    console.log('Erfolgreich mit MySQL verbunden!');
});

module.exports = connection;
