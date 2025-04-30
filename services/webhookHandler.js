const { updateMetafield } = require('./shopify');
const { getWatchRegistrationCode } = require('./mongo');
const fs = require('fs');
const path = require('path');

// Ensure logs folder exists
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

function log(message) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${message}\n`;
  console.log(line.trim());

  const logFile = path.join(logDir, 'webhook.log');
  fs.appendFileSync(logFile, line);
}

async function handleShipBobWebhook(req, res) {
  try {
    const payload = req.body;
    log(`📦 Webhook received:\n${JSON.stringify(payload, null, 2)}`);

    const orderId = payload.reference_id;
    if (!orderId) {
      log('❌ No order reference_id found in webhook payload');
      return res.status(400).json({ error: 'Missing order reference_id' });
    }

    let serialNumber = null;

    for (const shipment of payload.shipments || []) {
      for (const product of shipment.products || []) {
        for (const item of product.inventory_items || []) {
          if (item.serial_numbers && item.serial_numbers.length > 0) {
            serialNumber = item.serial_numbers[0];
            break;
          }
        }
        if (serialNumber) break;
      }
      if (serialNumber) break;
    }

    if (!serialNumber) {
      log('❌ No serial number found in webhook payload');
      return res.status(400).json({ error: 'No serial number found' });
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
