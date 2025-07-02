import express from 'express';
import { URLSearchParams } from 'url';
import { ProxyAgent, request } from 'undici';
import path from 'path';
import { fileURLToPath } from 'url';

const proxyList = [
  "https://bcd60f77c870ab96006e:6337aa71b03ff7e8@ip.proxynet.top:823",
  "https://bcd60f77c870ab96006e__cr.vg:6337aa71b03ff7e8@ip.proxynet.top:20000",
  "https://bcd60f77c870ab96006e__cr.ad:6337aa71b03ff7e8@ip.proxynet.top:20000",
  "https://bcd60f77c870ab96006e__cr.ae:6337aa71b03ff7e8@ip.proxynet.top:20000",
  "https://bcd60f77c870ab96006e__cr.ag:6337aa71b03ff7e8@ip.proxynet.top:20000",
  "https://bcd60f77c870ab96006e__cr.ai:6337aa71b03ff7e8@ip.proxynet.top:20000",
  "https://bcd60f77c870ab96006e__cr.vn:6337aa71b03ff7e8@ip.proxynet.top:823"
];

// __dirname alternative for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3002;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// API endpoint
app.post('/api/submit', async (req, res) => {
  const { xdr } = req.body;

  if (!xdr) return res.status(400).json({ error: 'Bad request: XDR is empty' });

  const formData = new URLSearchParams();
  formData.append('tx', xdr);
  const horizonSubmitURL = 'https://api.mainnet.minepi.com/transactions';

  const requestPromises = proxyList.map(proxyUrl => {
    const dispatcher = new ProxyAgent(proxyUrl);
    return request(horizonSubmitURL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
      dispatcher,
      bodyTimeout: 1000,
      headersTimeout: 1000,
    });
  });

  try {
    const successfulResponse = await Promise.any(requestPromises);
    const body = await successfulResponse.body.json();
    return res.status(successfulResponse.statusCode).json(body);
  } catch (error) {
    return res.status(502).json({
      error: 'Gagal submit transaksi ke Horizon: Semua proxy gagal atau timeout.',
      details: error.errors?.map(e => e.message)
    });
  }
});

// Jalankan server
app.listen(PORT, () => {
  console.log(`🚀 Server jalan di http://localhost:${PORT}`);
});
