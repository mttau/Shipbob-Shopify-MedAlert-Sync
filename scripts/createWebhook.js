require('dotenv').config();
const axios = require('axios');
const { getAccessToken } = require('../utils/tokenManager'); // ✅ Move to top

async function createShipBobWebhook() {
  try {
    const accessToken = await getAccessToken();
    const webhookUrl = process.env.SHIPBOB_WEBHOOK_URL;

    if (!accessToken) {
      throw new Error('Missing ShipBob Access Token!');
    }

    if (!webhookUrl) {
      throw new Error('Missing ShipBob Webhook URL!');
    }

    const body = {
      topic: 'order_shipped',
      subscription_url: webhookUrl
    };

    const response = await axios.post(
      'https://api.shipbob.com/1.0/webhook',
      body,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json-patch+json'
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
