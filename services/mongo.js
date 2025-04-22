const { MongoClient } = require('mongodb');

async function getWatchRegistrationCode(imei) {
  try {
    const client = new MongoClient(process.env.MONGO_URI);
    await client.connect();
    
    const db = client.db();
    const watches = db.collection('watches');
    
    const result = await watches.findOne({ imei });
    await client.close();
    
    return result?.watchRegistrationCode || null;
  } catch (error) {
    console.error('MongoDB Error:', error);
    return null;
  }
}

module.exports = { getWatchRegistrationCode };
