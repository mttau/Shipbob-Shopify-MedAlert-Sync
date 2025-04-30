const fs = require('fs');
const path = require('path');

const express = require('express');
require('dotenv').config();

const { handleShipBobWebhook } = require('./services/webhookHandler');
const oauthRoutes = require('./routes/oauth'); // ✅ Add this line

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// ✅ Mount OAuth routes
app.use(oauthRoutes);

// Webhook endpoint for ShipBob
app.post('/webhooks/shipbob/order-shipped', handleShipBobWebhook);

app.get('/', (req, res) => {
  res.send('✅ MedAlert webhook service is running!');
});

app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});

app.get('/logs', (req, res) => {
  const logPath = path.join(__dirname, 'logs/webhook.log');

  if (!fs.existsSync(logPath)) {
    return res.status(404).send('Log file not found.');
  }

  const logContent = fs.readFileSync(logPath, 'utf-8');

  res.set('Content-Type', 'text/plain');
  res.send(logContent);
});
