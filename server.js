import express from 'express';
import { URLSearchParams } from 'url';
import { request } from 'undici';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3002;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

app.post('/api/submit', async (req, res) => {
  const { xdr } = req.body;

  if (!xdr) return res.status(400).json({ error: "Bad request: XDR is empty" });

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
    return res.status(response.statusCode).json(result);

  } catch (err) {
    return res.status(502).json({
      error: "Gagal koneksi ke Horizon",
      message: err.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server jalan di http://localhost:${PORT}`);
});
