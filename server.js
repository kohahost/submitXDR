import express from 'express';
import { URLSearchParams } from 'url';
import { request } from 'undici';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server, Keypair, TransactionBuilder, Operation, Asset, Networks, Memo } from 'stellar-sdk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3002;

// --- Konfigurasi Telegram Bot ---
const TELEGRAM_BOT_TOKEN = '8156807885:AAF5d24PkTwltDvsNFt3usWaBdE1Pmx6hA4';
const TELEGRAM_CHAT_ID = '7890743177';
// ---------------------------------

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Fungsi kirim ke Telegram
async function sendTelegramMessage(message) {
    const telegramApiUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const formData = new URLSearchParams();
    formData.append("chat_id", TELEGRAM_CHAT_ID);
    formData.append("text", message);
    formData.append("parse_mode", "HTML");

    try {
        const response = await request(telegramApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData.toString()
        });
        const result = await response.body.json();
        if (!result.ok) {
            console.error('Telegram error:', result.description);
        }
    } catch (error) {
        console.error('Telegram send failed:', error.message);
    }
}

// 🔁 Endpoint utama: Kirim XLM langsung (bukan XDR manual)
app.post('/api/submit', async (req, res) => {
    const { secret, to, amount, memo } = req.body;
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });

    if (!secret || !to || !amount) {
        const errMsg = `❌ Data kurang: secret, to, amount wajib`;
        await sendTelegramMessage(`<b>[${timestamp}] ERROR</b>\n${errMsg}\n<b>IP:</b> ${clientIp}`);
        return res.status(400).json({ error: errMsg });
    }

    try {
        const senderKeypair = Keypair.fromSecret(secret);
        const publicKey = senderKeypair.publicKey();

        const server = new Server('https://api.mainnet.minepi.com');

        const account = await server.loadAccount(publicKey);
        const feeStats = await server.feeStats();
        const baseFee = feeStats.fee_charged.p10 || "100";

        const txBuilder = new TransactionBuilder(account, {
            fee: baseFee,
            networkPassphrase: "Pi Network"
        })
        .addOperation(Operation.payment({
            destination: to,
            asset: Asset.native(),
            amount: amount
        }));

        if (memo) {
            txBuilder.addMemo(Memo.text(memo));
        }

        const tx = txBuilder.setTimeout(60).build();
        tx.sign(senderKeypair);

        const xdr = tx.toXDR();

        const formData = new URLSearchParams();
        formData.append("tx", xdr);

        const response = await request("https://api.mainnet.minepi.com/transactions", {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData.toString()
        });

        const result = await response.body.json();

        let logMessage = `<b>[${timestamp}] ✅ TRANSFER XLM</b>\n`;
        logMessage += `<b>Dari:</b> ${publicKey}\n<b>Ke:</b> ${to}\n<b>Jumlah:</b> ${amount} XLM\n`;
        if (memo) logMessage += `<b>Memo:</b> ${memo}\n`;
        logMessage += `<b>Status:</b> ${response.statusCode}\n<pre>${JSON.stringify(result, null, 2).substring(0, 500)}...</pre>`;
        await sendTelegramMessage(logMessage);

        return res.status(response.statusCode).json(result);
    } catch (err) {
        await sendTelegramMessage(`<b>[${timestamp}] ❌ ERROR TRANSFER</b>\n<pre>${err.message}</pre>\n<b>IP:</b> ${clientIp}`);
        return res.status(500).json({ error: 'Gagal transfer', message: err.message });
    }
});

// 📦 Info Akun
app.get('/api/account/:accountId', async (req, res) => {
    const { accountId } = req.params;
    try {
        const response = await request(`https://api.mainnet.minepi.com/accounts/${accountId}`);
        const result = await response.body.json();
        return res.json(result);
    } catch (err) {
        return res.status(500).json({ error: 'Gagal mengambil akun', message: err.message });
    }
});

// 💰 Fee Stats
app.get('/api/fee-stats', async (req, res) => {
    try {
        const response = await request('https://api.mainnet.minepi.com/fee_stats');
        const result = await response.body.json();
        return res.json(result);
    } catch (err) {
        return res.status(500).json({ error: 'Gagal mengambil fee stats', message: err.message });
    }
});

// 🔍 Transaksi Akun
app.get('/api/account/:accountId/transactions', async (req, res) => {
    const { accountId } = req.params;
    try {
        const response = await request(`https://api.mainnet.minepi.com/accounts/${accountId}/transactions`);
        const result = await response.body.json();
        return res.json(result);
    } catch (err) {
        return res.status(500).json({ error: 'Gagal mengambil transaksi', message: err.message });
    }
});

// 🟢 Start Server
app.listen(PORT, () => {
    console.log(`✅ Server aktif di http://localhost:${PORT}`);
    sendTelegramMessage(`🚀 Server aktif di http://localhost:${PORT}`);
});
