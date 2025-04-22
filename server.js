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
