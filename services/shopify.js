const axios = require('axios');

async function updateMetafield(orderId, key, value) {
  try {
    const shop = process.env.SHOPIFY_STORE;
    const token = process.env.SHOPIFY_TOKEN;
    const version = process.env.SHOPIFY_API_VERSION || '2024-01';

    const url = `https://${shop}.myshopify.com/admin/api/${version}/orders/${orderId}/metafields.json`;
    
    const headers = {
      'X-Shopify-Access-Token': token,
      'Content-Type': 'application/json'
    };

    const payload = {
      metafield: {
        namespace: 'custom',
        key,
        value,
        type: 'single_line_text_field'
      }
    };

    const response = await axios.post(url, payload, { headers });
    return response.data;
  } catch (error) {
    console.error('Shopify API Error:', error.response?.data || error.message);
    throw error;
  }
}

module.exports = { updateMetafield };
