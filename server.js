import express from 'express';
import bodyParser from 'body-parser';
import { handler } from './handler.js';

const app = express();
const PORT = 3001;

app.use(bodyParser.json());

app.post('/submit', async (req, res) => {
  const result = await handler({
    httpMethod: 'POST',
    body: JSON.stringify(req.body)
  });
  res.status(result.statusCode).set(result.headers).send(result.body);
});

app.options('/submit', async (req, res) => {
  const result = await handler({ httpMethod: 'OPTIONS' });
  res.status(result.statusCode).set(result.headers).send();
});

app.listen(PORT, () => {
  console.log(`✅ Server berjalan di http://localhost:${PORT}/submit`);
});
