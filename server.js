const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const db = require('./database');
const axios = require('axios'); // Hayalet sinyal için gerekli

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());

// --- 11 Haneli Rastgele EcoID Numarası Üretme ---
const generateEcoNumber = () => {
    return Math.floor(10000000000 + Math.random() * 90000000000).toString();
};

// --- API UÇ NOKTALARI (ENDPOINTS) ---

// 1. Kayıt Olma (Kullanıcı Oluşturma ve EcoID Verme)
app.post('/register', (req, res) => {
    const { email, password, display_name, theme } = req.body;
    const ecoNumber = generateEcoNumber();

    db.run(`INSERT INTO users (email, password, eco_number, display_name, theme) VALUES (?, ?, ?, ?, ?)`,
        [email, bcrypt.hashSync(password, 10), ecoNumber, display_name, theme],
        function(err) {
            if (err) {
                return res.status(400).json({ success: false, error: "Bu e-posta zaten kayıtlı." });
            }
            res.json({ success: true, ecoNumber, displayName: display_name });
        }
    );
});

// 2. Mesaj Geçmişini Getirme
app.get('/messages/:myNum/:targetNum', (req, res) => {
    const { myNum, targetNum } = req.params;
    db.all(`SELECT * FROM messages WHERE (sender_number = ? AND receiver_number = ?) OR (sender_number = ? AND receiver_number = ?) ORDER BY timestamp ASC`,
        [myNum, targetNum, targetNum, myNum],
        (err, rows) => {
            if (err) {
                return res.status(400).json({ error: "Mesajlar alınamadı." });
            }
            res.json(rows);
        }
    );
});

// 3. Kullanıcı Arama (Numara ile)
app.get('/search/:number', (req, res) => {
    const { number } = req.params;
    db.get(`SELECT eco_number, display_name FROM users WHERE eco_number = ?`, [number], (err, row) => {
        if (err || !row) {
            return res.status(404).json({ success: false, error: "Kullanıcı bulunamadı." });
        }
        res.json({ success: true, user: row });
    });
});

// --- SOCKET.IO (ANLIK MESAJLAŞMA) ---
io.on('connection', (socket) => {
    console.log('Bir kullanıcı bağlandı:', socket.id);

    // Kullanıcıyı kendi EcoID odasına al
    socket.on('join', (ecoNumber) => {
        socket.join(ecoNumber);
        console.log(`Kullanıcı odasına katıldı: ${ecoNumber}`);
    });

    // Mesaj Gönderme
    socket.on('send_message', (data) => {
        const { sender, receiver, message } = data;
        
        // Veritabanına kaydet
        db.run(`INSERT INTO messages (sender_number, receiver_number, message_content) VALUES (?, ?, ?)`,
            [sender, receiver, message]);

        // Alıcıya anlık ilet
        io.to(receiver).emit('receive_message', data);
    });

    socket.on('disconnect', () => {
        console.log('Kullanıcı ayrıldı:', socket.id);
    });
});

// --- SUNUCU BAŞLATMA ---
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`EcoConnect Sunucusu ${PORT} portunda aktif!`);
});

// =========================================================
// --- HAYALET SİNYAL SİSTEMİ (KEEP-ALIVE) ---
// Bu kod her 10 dakikada bir sunucunun kendisine "Uyanık mısın?" diye sormasını sağlar.
// Böylece Render sunucuyu uyku moduna almaz.

setInterval(() => {
    // ⚠️ BURAYA DİKKAT: Alttaki tırnak içine Render'ın sana verdiği KENDİ linkini yapıştır!
    const MY_RENDER_URL = 'https://ecoconnect-server.onrender.com/ping'; 

    axios.get(MY_RENDER_URL)
        .then(() => console.log('Hayalet sinyal gönderildi: Sunucu uyanık tutuluyor.'))
        .catch((err) => console.log('Sinyal hatası (Normaldir, sunucu henüz açılmamış olabilir):', err.message));
}, 600000); // 600000 milisaniye = 10 dakika (Render için ideal süredir)

// Sunucunun cevap verebilmesi için küçük bir "Ping" kapısı açıyoruz
app.get('/ping', (req, res) => {
    res.send('Buradayım, uyanığım!');
});
// =========================================================