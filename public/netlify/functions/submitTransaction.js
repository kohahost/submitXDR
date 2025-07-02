const { URLSearchParams } = require('url');
const { ProxyAgent, request } = require('undici'); // Import dari undici

// Daftar proxy berbayar Anda. Proxy ini terlihat lebih andal.
const proxyList = [
  "https://bcd60f77c870ab96006e:6337aa71b03ff7e8@ip.proxynet.top:823",
  "https://bcd60f77c870ab96006e__cr.vg:6337aa71b03ff7e8@ip.proxynet.top:20000",
  "https://bcd60f77c870ab96006e__cr.ad:6337aa71b03ff7e8@ip.proxynet.top:20000",
  "https://bcd60f77c870ab96006e__cr.ae:6337aa71b03ff7e8@ip.proxynet.top:20000",
  "https://bcd60f77c870ab96006e__cr.ag:6337aa71b03ff7e8@ip.proxynet.top:20000",
  "https://bcd60f77c870ab96006e__cr.ai:6337aa71b03ff7e8@ip.proxynet.top:20000",
  "https://bcd60f77c870ab96006e__cr.vn:6337aa71b03ff7e8@ip.proxynet.top:823"
  // Anda bisa menambahkan lebih banyak proxy di sini untuk meningkatkan kemungkinan sukses
];

// Handler fungsi Lambda
exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: headers };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: headers, body: 'Method Not Allowed' };
  }

  let req;
  try {
    req = JSON.parse(event.body);
  } catch (err) {
    return { statusCode: 400, headers: headers, body: `Bad request: ${err.message}` };
  }

  if (!req.xdr) {
    return { statusCode: 400, headers: headers, body: 'Bad request: XDR is empty' };
  }

  console.log('Menerima XDR. Mencoba submit secara paralel...');

  const formData = new URLSearchParams();
  formData.append("tx", req.xdr);

  const horizonSubmitURL = "https://api.mainnet.minepi.com/transactions";

  // *** STRATEGI KECEPATAN: BUAT SEMUA PERMINTAAN SECARA BERSAMAAN ***
  const requestPromises = proxyList.map(proxyUrl => {
    console.log(`Menyiapkan request melalui proxy: ${new URL(proxyUrl).hostname}`);
    
    // Buat dispatcher proxy untuk setiap request
    const dispatcher = new ProxyAgent(proxyUrl);
    
    // Kembalikan sebuah Promise untuk request ini
    return request(horizonSubmitURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
      dispatcher: dispatcher,
      // Set timeout yang agresif untuk membatalkan proxy yang lambat
      bodyTimeout: 1000, // 1 detik
      headersTimeout: 1000,
    });
  });

  try {
    // Jalankan semua promise secara paralel dan tunggu yang PERTAMA KALI berhasil
    const successfulResponse = await Promise.any(requestPromises);
    
    const body = await successfulResponse.body.json();
    console.log(`Request berhasil dengan status: ${successfulResponse.statusCode}. Menggunakan salah satu proxy.`);

    return {
      statusCode: successfulResponse.statusCode,
      headers: headers,
      body: JSON.stringify(body),
    };

  } catch (error) {
    // Blok ini hanya akan berjalan jika SEMUA promise/proxy gagal
    console.log('Error: Semua proxy gagal.', error); // error adalah AggregateError
    return {
      statusCode: 502,
      headers: headers,
      body: JSON.stringify({
        error: "Gagal submit transaksi ke Horizon: Semua proxy gagal atau timeout.",
        details: error.errors.map(e => e.message) // Menampilkan detail error dari setiap proxy
      }),
    };
  }
};
