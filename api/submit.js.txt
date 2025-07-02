import { URLSearchParams } from 'url';
import { ProxyAgent, request } from 'undici';

const proxyList = [
  "https://bcd60f77c870ab96006e:6337aa71b03ff7e8@ip.proxynet.top:823",
  "https://bcd60f77c870ab96006e__cr.vg:6337aa71b03ff7e8@ip.proxynet.top:20000",
  "https://bcd60f77c870ab96006e__cr.ad:6337aa71b03ff7e8@ip.proxynet.top:20000",
  "https://bcd60f77c870ab96006e__cr.ae:6337aa71b03ff7e8@ip.proxynet.top:20000",
  "https://bcd60f77c870ab96006e__cr.ag:6337aa71b03ff7e8@ip.proxynet.top:20000",
  "https://bcd60f77c870ab96006e__cr.ai:6337aa71b03ff7e8@ip.proxynet.top:20000",
  "https://bcd60f77c870ab96006e__cr.vn:6337aa71b03ff7e8@ip.proxynet.top:823"
];

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const { xdr } = req.body;

  if (!xdr) return res.status(400).json({ error: "Bad request: XDR is empty" });

  console.log('Menerima XDR. Submit paralel...');

  const formData = new URLSearchParams();
  formData.append("tx", xdr);

  const horizonSubmitURL = "https://api.mainnet.minepi.com/transactions";

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
    console.error("Semua proxy gagal:", error);
    return res.status(502).json({
      error: "Gagal submit transaksi ke Horizon: Semua proxy gagal atau timeout.",
      details: error.errors?.map(e => e.message)
    });
  }
}
