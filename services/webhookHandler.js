const { updateMetafield } = require('./shopify');
const { getWatchRegistrationCode } = require('./mongo');

async function handleShipBobWebhook(req, res) {
  try {
    const { orderId, products } = req.body;

    if (!orderId || !products || products.length === 0) {
      return res.status(400).json({ error: 'Missing orderId or product data' });
    }

    // Find first serial number from first product with a value
    let serialNumber = null;

    for (const product of products) {
      const inventoryItems = product.inventory_items || [];

      for (const item of inventoryItems) {
        if (item.serial_numbers && item.serial_numbers.length > 0) {
          serialNumber = item.serial_numbers[0]; // Take the first one for now
          break;
        }
      }

      if (serialNumber) break;
    }

    if (!serialNumber) {
      return res.status(400).json({ error: 'No serial number found in payload' });
    }

    // Step 1: Save IMEI to Shopify
    await updateMetafield(orderId, 'imei', serialNumber);

    // Step 2: Look up registration code from Mongo
    const code = await getWatchRegistrationCode(serialNumber);
    if (code) {
      await updateMetafield(orderId, 'watch_registration_code', code);
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Webhook error:', err);
    return res.status(500).json({ error: err.message });
  }
}

module.exports = { handleShipBobWebhook };

