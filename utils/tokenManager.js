const fs = require('fs');
const path = require('path');
const axios = require('axios');
const qs = require('qs');

const tokenPath = path.join(__dirname, '../tokens.json');

async function getAccessToken() {
  if (!fs.existsSync(tokenPath)) {
    throw new Error('No tokens.json file found. Run OAuth first.');
  }

  const tokenData = JSON.parse(fs.readFileSync(tokenPath, 'utf-8'));

  const now = Date.now();
  if (tokenData.expires_at > now) {
    return tokenData.access_token;
  }

  // Token expired — refresh it
  console.log('🔄 Refreshing access token...');
  const refreshData = qs.stringify({
    grant_type: 'refresh_token',
    refresh_token: tokenData.refresh_token,
    client_id: process.env.SHIPBOB_CLIENT_ID,
    client_secret: process.env.SHIPBOB_CLIENT_SECRET
  });

  const response = await axios.post('https://auth.shipbob.com/connect/token', refreshData, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });

  const { access_token, refresh_token, expires_in } = response.data;

  const newTokenData = {
    access_token,
    refresh_token,
    expires_at: Date.now() + expires_in * 1000
  };

  fs.writeFileSync(tokenPath, JSON.stringify(newTokenData, null, 2));
  console.log('✅ Token refreshed and saved.');

  return newTokenData.access_token;
}

module.exports = { getAccessToken };
