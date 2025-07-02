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

export async function handler(event) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  }

  let req;
  try {
    req = JSON.parse(event.body);
  } catch (err) {
    return { statusCode: 400, headers, body: `Bad request: ${err.message}` };
  }

  if (!req.xdr) {
    return { statusCode: 400, headers, body: 'Bad request: XDR is empty' };
  }

  const formData = new URLSearchParams();
  formData.append("tx", req.xdr);
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

    return {
      statusCode: successfulResponse.statusCode,
      headers,
      body: JSON.stringify(body),
    };
  } catch (error) {
    return {
      statusCode: 502,
      headers,
      body: JSON.stringify({
        error: "Gagal submit transaksi ke Horizon: Semua proxy gagal atau timeout.",
        details: error.errors.map(e => e.message)
      }),
    };
  }
}
