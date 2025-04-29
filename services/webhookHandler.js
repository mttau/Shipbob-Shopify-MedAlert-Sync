const { updateMetafield } = require('./shopify');
const { getWatchRegistrationCode } = require('./mongo');
const fs = require('fs');
const path = require('path');

function log(message) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${message}\n`;
  console.log(line.trim());

  const logFile = path.join(__dirname, '../logs/webhook.log');
  fs.appendFileSync(logFile, line);
}

async function handleShipBobWebhook(req, res) {
  try {
    const { orderId, products } = req.body;

    log(`📦 Webhook received:\n${JSON.stringify(req.body, null, 2)}`);

    if (!orderId || !products || products.length === 0) {
      log('❌ Missing orderId or product data');
      return res.status(400).json({ error: 'Missing orderId or product data' });
    }

    let serialNumber = null;

    for (const product of products) {
      const inventoryItems = product.inventory_items || [];

      for (const item of inventoryItems) {
        if (item.serial_numbers && item.serial_numbers.length > 0) {
          serialNumber = item.serial_numbers[0];
          break;
        }
      }

      if (serialNumber) break;
    }

    if (!serialNumber) {
      log('❌ No serial number found in payload');
      return res.status(400).json({ error: 'No serial number found in payload' });
    }

    log(`🔧 IMEI Found: ${serialNumber}`);
    log(`🔧 Updating Shopify order ${orderId} with IMEI...`);
    await updateMetafield(orderId, 'imei', serialNumber);
    log(`✅ IMEI metafield added`);

    const regCode = await getWatchRegistrationCode(serialNumber);

    if (!regCode) {
      log(`⚠️ No registration code found for IMEI: ${serialNumber}`);
    } else {
      log(`🔧 Adding registration code to Shopify: ${regCode}`);
      await updateMetafield(orderId, 'watch_registration_code', regCode);
      log('✅ Registration code added');
    }

    log(`✅ Webhook for order ${orderId} processed successfully.\n`);
    return res.status(200).json({ success: true });
  } catch (err) {
    log(`❌ Webhook error: ${err.stack || err.message}`);
    return res.status(500).json({ error: err.message });
  }
}

module.exports = { handleShipBobWebhook };
