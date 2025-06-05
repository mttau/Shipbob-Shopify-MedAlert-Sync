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

    const watchData = await getWatchRegistrationCode(serialNumber);

    if (!watchData) {
      log(`⚠️ No watch data found for IMEI: ${serialNumber}`);
    } else {
      // Update registration code if available
      if (watchData.registrationCode) {
        log(`🔧 Adding registration code to Shopify: ${watchData.registrationCode}`);
        await updateMetafield(orderId, 'watch_registration_code', watchData.registrationCode);
        log('✅ Registration code added');
      }

      // Update SIM serial number if available
      if (watchData.simSerialNumber) {
        log(`🔧 Adding SIM serial number to Shopify: ${watchData.simSerialNumber}`);
        await updateMetafield(orderId, 'sim_serial_number', watchData.simSerialNumber);
        log('✅ SIM serial number added');
      }

      // Update SIM ICCID if available
      if (watchData.simICCID) {
        log(`🔧 Adding SIM ICCID to Shopify: ${watchData.simICCID}`);
        await updateMetafield(orderId, 'sim_iccid', watchData.simICCID);
        log('✅ SIM ICCID added');
      }
    }

    log(`✅ Webhook for order ${orderId} processed successfully.\n`);
    return res.status(200).json({ success: true });
  } catch (err) {
    log(`❌ Webhook error: ${err.stack || err.message}`);
    return res.status(500).json({ error: err.message });
  }
}

module.exports = { handleShipBobWebhook };
