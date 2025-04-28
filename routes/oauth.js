const express = require('express');
const axios = require('axios');
const router = express.Router();

// Step 1: Redirect to ShipBob's OAuth consent page
router.get('/auth/shipbob', (req, res) => {
  const clientId = process.env.SHIPBOB_CLIENT_ID;
  const redirectUri = process.env.SHIPBOB_REDIRECT_URI;
  const scope = 'orders_read webhooks_read webhooks_write offline_access'; // add any scopes you want
  const responseType = 'code';

  const authUrl = `https://auth.shipbob.com/connect/authorize?response_type=${responseType}&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&response_mode=query`;

  res.redirect(authUrl);
});

// Step 2: Handle the OAuth callback and exchange code for access token
router.get('/oauth/callback', async (req, res) => {
  const { code } = req.query;

  if (!code) return res.status(400).send('No code provided');

  try {
    const tokenResponse = await axios.post('https://auth.shipbob.com/connect/token', {
      grant_type: 'authorization_code',
      code,
      client_id: process.env.SHIPBOB_CLIENT_ID,
      client_secret: process.env.SHIPBOB_CLIENT_SECRET,
      redirect_uri: process.env.SHIPBOB_REDIRECT_URI
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const accessToken = tokenResponse.data.access_token;

    console.log('✅ ShipBob Access Token:', accessToken);

    res.send('OAuth success! Access token logged to server console.');
  } catch (error) {
    console.error('OAuth token error:', error.response?.data || error.message);
    res.status(500).send('OAuth failed');
  }
});

module.exports = router;
