import express from 'express';
import { URLSearchParams } from 'url';
import { request } from 'undici';
import path from 'path';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';

// Konfigurasi
const PORT = 3002;
const API_KEY = 'apikey_rahasia123';
const ALLOWED_ORIGIN = 'https://xdr.zendshost.id';
const HORIZON_URL = 'https://api.mainnet.minepi.com/transactions';
const TELEGRAM_BOT_TOKEN = '8156807885:AAF5d24PkTwltDvsNFt3usWaBdE1Pmx6hA4';
const TELEGRAM_CHAT_ID = '7890743177';

// Helper: __dirname (ESM)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Inisialisasi Express
const app = express();

// CORS: izinkan hanya frontend tertentu
app.use(cors({
  origin: ALLOWED_ORIGIN,
  methods: ['POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Static file
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({ limit: '1mb' }));

// Rate limiter: max 1x per detik
app.use('/api/submit', rateLimit({
  windowMs: 1000,
  max: 1,
  standardHeaders: true,
  legacyHeaders: false
}));

// Middleware autentikasi API key
app.use('/api/submit', (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (token !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});

// Fungsi kirim Telegram
async function sendTelegram(message) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  try {
    await request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message
      }),
      timeout: 5000
    });
  } catch (err) {
    console.error('❌ Gagal kirim ke Telegram:', err.message);
  }
}

// Fungsi logging
function logInfo(label, data) {
  console.log(`✅ ${label}:`, JSON.stringify(data, null, 2));
}
function logError(label, data) {
  console.error(`❌ ${label}:`, JSON.stringify(data, null, 2));
}

// Endpoint utama: kirim XDR
app.post('/api/submit', async (req, res) => {
  const { xdr, wallet } = req.body;

  if (!xdr || typeof xdr !== 'string' || xdr.length < 20) {
    return res.status(400).json({ error: 'XDR tidak valid' });
  }

  if (!wallet || !wallet.startsWith('G')) {
    return res.status(400).json({ error: 'Wallet tidak valid' });
  }

  try {
    const start = Date.now();
    const formData = new URLSearchParams({ tx: xdr });

    const response = await request(HORIZON_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
      timeout: 8000
    });

    const result = await response.body.json();
    const durasi = Date.now() - start;

    if (result.successful) {
      logInfo('Transfer sukses', { wallet, durasi });
      await sendTelegram(`✅ Transfer sukses ke: ${wallet}\n⚡ Durasi: ${durasi}ms`);
    } else {
      logError('Transfer gagal', result);
      await sendTelegram(`❌ Gagal transfer ke: ${wallet}\nKode: ${result?.extras?.result_codes?.transaction || 'Unknown'}`);
    }

    return res.status(response.statusCode).json({ ...result, durasi });

  } catch (err) {
    logError('Gagal submit XDR', err);
    await sendTelegram(`⛔ Gagal koneksi Horizon\n${err.message}`);
    return res.status(502).json({ error: 'Gagal koneksi Horizon', message: err.message });
  }
});

// Jalankan server
app.listen(PORT, () => {
  console.log(`🚀 Server aktif di http://localhost:${PORT}`);
});
