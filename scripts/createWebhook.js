require('dotenv').config();
const axios = require('axios');

async function createShipBobWebhook() {
  try {
    const accessToken = process.env.SHIPBOB_ACCESS_TOKEN; // ✅ load from environment!

    const response = await axios.post(
      'https://api.shipbob.com/1.0/webhook', // ✅ Correct endpoint
      {
        webhook_uri: process.env.SHIPBOB_WEBHOOK_URL,
        webhook_type: 'order_shipped', // ✅ Correct field name for v1.0
        description: 'Webhook for MedAlert order_shipped'
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`, // ✅ Use real OAuth token
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Webhook created successfully!');
    console.log(response.data);
  } catch (err) {
    console.error('❌ Failed to create webhook:');
    console.error(err.response?.data || err.message);
  }
}

createShipBobWebhook();
