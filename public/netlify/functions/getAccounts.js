const https = require('https');  // Menggunakan https bawaan Node.js

// Contoh API eksternal (misalnya, API blockchain) untuk mendapatkan data akun
const API_URL = "https://api.mainnet.minepi.com/accounts/";

// Lambda function handler
exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",  // CORS Header untuk frontend
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };

  // Handle OPTIONS request (CORS preflight)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: headers,
    };
  }

  // Ambil parameter `account` dari query string
  const accountID = event.queryStringParameters.account;

  if (!accountID) {
    return {
      statusCode: 400,
      headers: headers,
      body: JSON.stringify({ error: "Account parameter is missing" }),
    };
  }

  // Validasi format account ID
  if (!isValidAccountID(accountID)) {
    return {
      statusCode: 400,
      headers: headers,
      body: JSON.stringify({
        type: "https://stellar.org/horizon-errors/bad_request",
        title: "Bad Request",
        status: 400,
        detail: "The request you sent was invalid in some way.",
        extras: {
          invalid_field: "account_id",
          reason: "Account ID must start with `G` and contain 56 alphanum characters"
        }
      }),
    };
  }

  try {
    // Mengambil data dari API eksternal untuk akun
    const accountData = await getAccountData(accountID);

    // Format respons sesuai dengan struktur yang diinginkan
    const formattedResponse = {
      _links: {
        self: {
          href: `https://api.mainnet.minepi.com/accounts/${accountID}`
        },
        transactions: {
          href: `https://api.mainnet.minepi.com/accounts/${accountID}/transactions{?cursor,limit,order}`,
          templated: true
        },
        operations: {
          href: `https://api.mainnet.minepi.com/accounts/${accountID}/operations{?cursor,limit,order}`,
          templated: true
        },
        payments: {
          href: `https://api.mainnet.minepi.com/accounts/${accountID}/payments{?cursor,limit,order}`,
          templated: true
        },
        effects: {
          href: `https://api.mainnet.minepi.com/accounts/${accountID}/effects{?cursor,limit,order}`,
          templated: true
        },
        offers: {
          href: `https://api.mainnet.minepi.com/accounts/${accountID}/offers{?cursor,limit,order}`,
          templated: true
        },
        trades: {
          href: `https://api.mainnet.minepi.com/accounts/${accountID}/trades{?cursor,limit,order}`,
          templated: true
        },
        data: {
          href: `https://api.mainnet.minepi.com/accounts/${accountID}/data/{key}`,
          templated: true
        }
      },
      id: accountID,
      account_id: accountID,
      sequence: accountData.sequence,
      sequence_ledger: accountData.sequence_ledger,
      sequence_time: accountData.sequence_time,
      subentry_count: accountData.subentry_count,
      last_modified_ledger: accountData.last_modified_ledger,
      last_modified_time: accountData.last_modified_time,
      thresholds: accountData.thresholds,
      flags: accountData.flags,
      balances: accountData.balances,
      signers: accountData.signers,
      data: accountData.data,
      num_sponsoring: accountData.num_sponsoring,
      num_sponsored: accountData.num_sponsored,
      paging_token: accountData.paging_token,
    };

    return {
      statusCode: 200,
      headers: headers,
      body: JSON.stringify(formattedResponse),
    };
  } catch (err) {
    console.log('Error fetching account data:', err);
    return {
      statusCode: 502,
      headers: headers,
      body: JSON.stringify({ error: "Failed to fetch account data", message: err.message }),
    };
  }
};

// Fungsi untuk memvalidasi format account ID
function isValidAccountID(accountID) {
  const accountIDRegex = /^G[A-Z0-9]{55}$/;  // Format valid: G diikuti 55 karakter alfanumerik
  return accountIDRegex.test(accountID);
}

// Fungsi untuk mengambil data akun menggunakan https
function getAccountData(accountID) {
  return new Promise((resolve, reject) => {
    const url = `${API_URL}${accountID}`;

    https.get(url, (response) => {
      let data = '';

      // Menerima data yang diterima
      response.on('data', (chunk) => {
        data += chunk;
      });

      // Setelah selesai menerima data
      response.on('end', () => {
        try {
          // Parsing data JSON
          const jsonResponse = JSON.parse(data);
          resolve(jsonResponse);
        } catch (err) {
          reject(new Error('Error parsing JSON data'));
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}
