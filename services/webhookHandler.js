const { updateMetafield } = require('./shopify');
const { getWatchRegistrationCode } = require('./mongo');
const { getDeviceDetails, JasperApiError } = require('./jasper');
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

async function updateOrderMetafields(orderId, watchData) {
  const updates = [];
  
  // Update registration code if available
  if (watchData.registrationCode) {
    updates.push(updateMetafield(orderId, 'watch_registration_code', watchData.registrationCode)
      .then(() => log('✅ Registration code added'))
      .catch(err => log(`❌ Failed to update registration code: ${err.message}`)));
  }

  // Update SIM serial number if available
  if (watchData.simSerialNumber) {
    updates.push(updateMetafield(orderId, 'sim_serial_number', watchData.simSerialNumber)
      .then(() => log('✅ SIM serial number added'))
      .catch(err => log(`❌ Failed to update SIM serial number: ${err.message}`)));
  }

  // Update SIM ICCID if available
  if (watchData.simICCID) {
    updates.push(updateMetafield(orderId, 'sim_iccid', watchData.simICCID)
      .then(() => log('✅ SIM ICCID added'))
      .catch(err => log(`❌ Failed to update SIM ICCID: ${err.message}`)));
  }

  // Wait for all metafield updates to complete
  await Promise.all(updates);
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
      // Update all metafields from MongoDB data
      await updateOrderMetafields(orderId, watchData);

      // Try to get SIM phone number from Jasper if we have an ICCID
      if (watchData.simICCID) {
        try {
          const jasperResult = await getDeviceDetails(watchData.simICCID);
          
          if (jasperResult.success) {
            log(`🔧 Adding SIM phone number to Shopify: ${jasperResult.msisdn}`);
            await updateMetafield(orderId, 'sim_phone_number', jasperResult.msisdn);
            log('✅ SIM phone number added');
          } else {
            log(`⚠️ ${jasperResult.error}`);
          }
        } catch (error) {
          if (error instanceof JasperApiError) {
            log(`⚠️ Jasper API Error (${error.type}): ${error.message}`);
          } else {
            log(`⚠️ Unexpected error getting SIM phone number: ${error.message}`);
          }
          // Continue processing - don't let Jasper errors affect the rest of the flow
        }
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
