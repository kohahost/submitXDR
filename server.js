import express from 'express';
import bodyParser from 'body-parser';
import { handler } from './submitXDR.js';

const app = express();
const PORT = 3000;

app.use(bodyParser.json());

app.post('/submit', async (req, res) => {
  const event = {
    httpMethod: 'POST',
    body: JSON.stringify(req.body)
  };

  const result = await handler(event);

  res.status(result.statusCode).set(result.headers).send(result.body);
});

app.options('/submit', async (req, res) => {
  const result = await handler({ httpMethod: 'OPTIONS' });
  res.status(result.statusCode).set(result.headers).send();
});

app.listen(PORT, () => {
  console.log(`✅ Server berjalan di http://202.10.36.84:${PORT}`);
});
