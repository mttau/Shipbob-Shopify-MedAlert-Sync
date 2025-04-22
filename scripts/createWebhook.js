require('dotenv').config();
const axios = require('axios');

async function createShipBobWebhook() {
  try {
    const response = await axios.post(
      'https://api.shipbob.com/2.0/webhooks',
      {
        topic: 'order_shipped',
        target_url: process.env.SHIPBOB_WEBHOOK_URL,
        description: 'Webhook for MedAlert order_shipped'
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.SHIPBOB_PAT}`,
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

