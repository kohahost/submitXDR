import express from 'express';
import { URLSearchParams } from 'url';
import { request } from 'undici';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3002;

// --- Konfigurasi Telegram Bot ---
const TELEGRAM_BOT_TOKEN = '8156807885:AAF5d24PkTwltDvsNFt3usWaBdE1Pmx6hA4'; // Ganti dengan token bot Anda
const TELEGRAM_CHAT_ID = '7890743177';     // Ganti dengan chat ID Anda
// ---------------------------------

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Fungsi untuk mengirim pesan ke Telegram
async function sendTelegramMessage(message) {
    const telegramApiUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const formData = new URLSearchParams();
    formData.append("chat_id", TELEGRAM_CHAT_ID);
    formData.append("text", message);
    formData.append("parse_mode", "HTML"); // Untuk formatting HTML

    try {
        const response = await request(telegramApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData.toString()
        });
        const result = await response.body.json();
        if (!result.ok) {
            console.error('Gagal mengirim pesan Telegram:', result.description);
        }
    } catch (error) {
        console.error('Error saat mengirim pesan Telegram:', error.message);
    }
}

app.post('/api/submit', async (req, res) => {
    const { xdr } = req.body;
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });

    // Log awal request ke Telegram
    let logMessage = `<b>[${timestamp}] Request Baru Masuk!</b>\n`;
    logMessage += `<b>IP:</b> ${clientIp}\n`;
    logMessage += `<b>XDR Diterima:</b> ${xdr ? xdr.substring(0, 100) + '...' : 'Tidak ada XDR'}\n`; // Batasi panjang XDR untuk log

    await sendTelegramMessage(logMessage);

    if (!xdr) {
        const errorMessage = "Bad request: XDR is empty";
        await sendTelegramMessage(`[${timestamp}] ERROR: ${errorMessage} dari IP ${clientIp}`);
        return res.status(400).json({ error: errorMessage });
    }

    const formData = new URLSearchParams();
    formData.append("tx", xdr);

    try {
        const horizonSubmitURL = "https://api.mainnet.minepi.com/transactions";
        const response = await request(horizonSubmitURL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData.toString()
        });

        const result = await response.body.json();

        // Log hasil dari Horizon ke Telegram
        let resultMessage = `<b>[${timestamp}] Hasil Submit ke Horizon:</b>\n`;
        resultMessage += `<b>Status HTTP:</b> ${response.statusCode}\n`;
        resultMessage += `<b>IP Asal:</b> ${clientIp}\n`;
        resultMessage += `<b>Respon:</b> <pre>${JSON.stringify(result, null, 2).substring(0, 500)}...</pre>`; // Batasi panjang respon

        await sendTelegramMessage(resultMessage);

        return res.status(response.statusCode).json(result);

    } catch (err) {
        const errorMessage = "Gagal koneksi ke Horizon";
        // Log error ke Telegram
        let errorMessageTelegram = `<b>[${timestamp}] ERROR Koneksi ke Horizon:</b>\n`;
        errorMessageTelegram += `<b>IP Asal:</b> ${clientIp}\n`;
        errorMessageTelegram += `<b>Pesan Error:</b> ${err.message}\n`;

        await sendTelegramMessage(errorMessageTelegram);

        return res.status(502).json({
            error: errorMessage,
            message: err.message
        });
    }
});

app.listen(PORT, () => {
    console.log(`✅ Server jalan di http://localhost:${PORT}`);
    sendTelegramMessage(`Server aplikasi telah berhasil berjalan di http://localhost:${PORT}`);
});
