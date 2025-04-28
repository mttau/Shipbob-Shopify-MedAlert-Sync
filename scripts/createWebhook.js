require('dotenv').config();
const axios = require('axios');

async function createShipBobWebhook() {
  try {
    const accessToken = process.env.SHIPBOB_ACCESS_TOKEN;

    if (!accessToken) {
      throw new Error('Missing ShipBob Access Token!');
    }

    const response = await axios.post(
      'https://api.shipbob.com/1.0/webhook',
      {
        Topic: 'order_shipped', // ✅ Capital T
        SubscriptionUrl: process.env.SHIPBOB_WEBHOOK_URL, // ✅ Capital S
        Description: 'Webhook for MedAlert order_shipped'
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
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
