const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const db = require('./database');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());

const generateEcoNumber = () => Math.floor(10000000000 + Math.random() * 90000000000).toString();

app.post('/register', (req, res) => {
    const { email, password, display_name, theme } = req.body;
    const ecoNumber = generateEcoNumber();
    db.run(`INSERT INTO users (email, password, eco_number, display_name, theme) VALUES (?, ?, ?, ?, ?)`,
        [email, bcrypt.hashSync(password, 10), ecoNumber, display_name, theme], (err) => {
            if (err) return res.status(400).json({ error: "Hata" });
            res.json({ success: true, ecoNumber });
        });
});

app.get('/messages/:myNum/:targetNum', (req, res) => {
    db.all(`SELECT * FROM messages WHERE (sender_number = ? AND receiver_number = ?) OR (sender_number = ? AND receiver_number = ?)`,
        [req.params.myNum, req.params.targetNum, req.params.targetNum, req.params.myNum], (err, rows) => {
            res.json(rows || []);
        });
});

io.on('connection', (socket) => {
    socket.on('join', (num) => socket.join(num));
    socket.on('send_message', (data) => {
        db.run(`INSERT INTO messages (sender_number, receiver_number, message_content) VALUES (?, ?, ?)`,
            [data.sender, data.receiver, data.message]);
        io.to(data.receiver).emit('receive_message', data);
    });
});

// İNTERNET İÇİN KRİTİK AYAR:
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Sunucu ${PORT} portunda hazır!`));