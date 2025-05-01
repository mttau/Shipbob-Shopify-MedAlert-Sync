const { MongoClient } = require('mongodb');

async function getWatchRegistrationCode(imei) {
  try {
    const client = new MongoClient(process.env.MONGO_URI);
    await client.connect();

    const db = client.db();
    const watches = db.collection('watchdata');

    const result = await watches.findOne({ imei: String(imei) }); // ✅ Fix

    await client.close();

    return result?.registrationCode || null;
  } catch (error) {
    console.error('MongoDB Error:', error);
    return null;
  }
}

module.exports = { getWatchRegistrationCode };
