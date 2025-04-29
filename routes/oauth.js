const fs = require('fs');
const path = require('path');
const qs = require('qs');
const express = require('express');
const axios = require('axios');
const router = express.Router();

// Step 1: Redirect to ShipBob's OAuth consent page
router.get('/auth/shipbob', (req, res) => {
  const clientId = process.env.SHIPBOB_CLIENT_ID;
  const redirectUri = process.env.SHIPBOB_REDIRECT_URI;
  const scope = 'orders_read webhooks_read webhooks_write offline_access';
  const responseType = 'code';
  const responseMode = 'query';

  const authUrl = `https://auth.shipbob.com/connect/authorize?response_type=${responseType}&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&response_mode=${responseMode}`;

  res.redirect(authUrl);
});

// Step 2: Handle the OAuth callback and exchange code for access token
router.get('/oauth/callback', async (req, res) => {
  const { code } = req.query;

  if (!code) return res.status(400).send('No code provided');

  try {
    const data = qs.stringify({
      grant_type: 'authorization_code',
      code,
      client_id: process.env.SHIPBOB_CLIENT_ID,
      client_secret: process.env.SHIPBOB_CLIENT_SECRET,
      redirect_uri: process.env.SHIPBOB_REDIRECT_URI
    });

    const tokenResponse = await axios.post('https://auth.shipbob.com/connect/token', data, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const { access_token, refresh_token, expires_in } = tokenResponse.data;

    const tokenData = {
      access_token,
      refresh_token,
      expires_at: Date.now() + expires_in * 1000
    };

    const tokenPath = path.join(__dirname, '../../tokens.json');
    fs.writeFileSync(tokenPath, JSON.stringify(tokenData, null, 2));

    console.log('✅ OAuth tokens saved to tokens.json');
    res.send('OAuth success! Tokens saved to disk.');
  } catch (error) {
    console.error('OAuth token error:', error.response?.data || error.message);
    res.status(500).send('OAuth failed');
  }
});

module.exports = router;
