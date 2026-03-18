const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./ecoconnect.db');

db.serialize(() => {
    // Kullanıcılar Tablosu
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE,
        password TEXT,
        eco_number TEXT UNIQUE,
        display_name TEXT,
        profile_pic TEXT,
        status TEXT DEFAULT 'Hey! EcoConnect kullanıyorum.',
        theme TEXT DEFAULT 'light',
        ringtone TEXT DEFAULT 'huzur_1.mp3',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Mesajlar Tablosu (Sınırsız Bulut Depolama)
    db.run(`CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender_number TEXT,
        receiver_number TEXT,
        message_content TEXT,
        media_url TEXT,
        message_type TEXT DEFAULT 'text', 
        is_read INTEGER DEFAULT 0,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Gruplar Tablosu
    db.run(`CREATE TABLE IF NOT EXISTS groups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        group_name TEXT,
        admin_number TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Grup Üyeleri Tablosu
    db.run(`CREATE TABLE IF NOT EXISTS group_members (
        group_id INTEGER,
        user_number TEXT,
        FOREIGN KEY(group_id) REFERENCES groups(id)
    )`);
});

module.exports = db;