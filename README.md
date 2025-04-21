# Shipbob-Shopify-MedAlert-Sync

# MedAlert: ShipBob to Shopify Sync Service (Render Deployment – Full Spec)

## Project Objective

Build and deploy a headless service that:

1. Listens for **order shipped events** from ShipBob
2. Extracts the **IMEI (serial number)** from each shipment
3. Updates the corresponding **Shopify order metafields**:
   - IMEI
   - Watch registration code (fetched from MongoDB Atlas)
4. Is hosted as a secure, reliable **Node.js (Express)** backend on **Render**
5. Uses the ShipBob **Webhooks API v2** to create the webhook subscription via API

---

## Tech Stack

- **Backend Framework**: Node.js with Express
- **Hosting**: Render (Web Service)
- **Database**: MongoDB Atlas (for IMEI lookup)
- **E-commerce**: Shopify Admin REST API (order metafields)
- **Webhooks**: ShipBob Webhooks API v2

---

## Key Integration Summary

- ShipBob **does not allow manual webhook creation** via dashboard. You must:
  - Authenticate using a **Personal Access Token (PAT)**
  - Create a **Webhook Connection** via the API
  - Register your webhook endpoint
- Webhooks must use HTTPS
- Your webhook URL must be passed in a POST request to ShipBob’s `/webhooks` endpoint

---

## Metafields to Update in Shopify

| Key                       | Namespace | Type                     | Description                           |
| ------------------------- | --------- | ------------------------ | ------------------------------------- |
| `imei`                    | `custom`  | `single_line_text_field` | The serial number from ShipBob        |
| `watch_registration_code` | `custom`  | `single_line_text_field` | Value fetched from MongoDB using IMEI |

---

## Workflow Overview

1. ShipBob calls our webhook with an `order_shipped` payload
2. We extract `orderId` and `serialNumber`
3. We update Shopify order metafield `imei`
4. We query MongoDB Atlas for matching registration code
5. If found, we update `watch_registration_code` in Shopify
6. Return 200 OK

---

## Project Structure

```
.
├── server.js
├── services
│   ├── shopify.js
│   ├── mongo.js
│   └── webhookHandler.js
├── scripts
│   └── createWebhook.js      # Script to register ShipBob webhook
├── utils
│   └── logger.js
├── .env
└── package.json
```

---

## Required Environment Variables

```env
PORT=3000
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/medalert
SHOPIFY_STORE=aeec8f-2
SHOPIFY_TOKEN=shpat_XXX
SHOPIFY_API_VERSION=2023-10
SHIPBOB_PAT=sbpat_XXX
SHIPBOB_WEBHOOK_URL=https://yourdomain.com/webhooks/shipbob/order-shipped
```

---

## Backend Setup (Node.js + Express)

### `server.js`

```js
import express from 'express';
import dotenv from 'dotenv';
import { handleShipBobWebhook } from './services/webhookHandler.js';

dotenv.config();

const app = express();
app.use(express.json());

app.post('/webhooks/shipbob/order-shipped', handleShipBobWebhook);

app.get('/', (req, res) => res.send('MedAlert Sync Service Running'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Listening on ${PORT}`));
```

### `services/webhookHandler.js`

```js
import { updateMetafield } from './shopify.js';
import { getWatchRegistrationCode } from './mongo.js';

export async function handleShipBobWebhook(req, res) {
  try {
    const { orderId, orderItems } = req.body;
    const serialNumber = orderItems?.[0]?.serialNumber;

    if (!orderId || !serialNumber) {
      return res.status(400).json({ error: 'Missing orderId or serialNumber' });
    }

    await updateMetafield(orderId, 'imei', serialNumber);

    const code = await getWatchRegistrationCode(serialNumber);
    if (code) {
      await updateMetafield(orderId, 'watch_registration_code', code);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Webhook processing failed', error);
    res.status(500).json({ error: error.message });
  }
}
```

### `services/shopify.js`

```js
import axios from 'axios';

export async function updateMetafield(orderId, key, value) {
  const shop = process.env.SHOPIFY_STORE;
  const token = process.env.SHOPIFY_TOKEN;
  const version = process.env.SHOPIFY_API_VERSION;

  const url = `https://${shop}.myshopify.com/admin/api/${version}/orders/${orderId}/metafields.json`;
  const headers = {
    'X-Shopify-Access-Token': token,
    'Content-Type': 'application/json'
  };

  const payload = {
    metafield: {
      namespace: 'custom',
      key,
      value,
      type: 'single_line_text_field'
    }
  };

  await axios.post(url, payload, { headers });
}
```

### `services/mongo.js`

```js
import { MongoClient } from 'mongodb';

export async function getWatchRegistrationCode(imei) {
  const client = new MongoClient(process.env.MONGO_URI);
  await client.connect();
  const db = client.db();
  const watches = db.collection('watches');

  const result = await watches.findOne({ imei });
  await client.close();
  return result?.watchRegistrationCode || null;
}
```

---

## Webhook Creation Script

### `scripts/createWebhook.js`

```js
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

async function createShipBobWebhook() {
  try {
    const res = await axios.post(
      'https://api.shipbob.com/2.0/webhooks',
      {
        topic: 'order_shipped',
        target_url: process.env.SHIPBOB_WEBHOOK_URL,
        description: 'Webhook for MedAlert order shipped'
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.SHIPBOB_PAT}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('Webhook created successfully:', res.data);
  } catch (err) {
    console.error('Error creating webhook:', err.response?.data || err.message);
  }
}

createShipBobWebhook();
```

---

## Deploying on Render

1. Push project to GitHub.
2. Create **new Web Service** on Render:
   - Runtime: Node
   - Build Command: `npm install`
   - Start Command: `node server.js`
3. Add all necessary **environment variables**.
4. Deploy the service.
5. Note the public Render URL (e.g., `https://medalert-service.onrender.com`)
6. Run `node scripts/createWebhook.js` to register the webhook with ShipBob.

---

## Final Checklist for Developer

-

---

## References

- ShipBob Webhooks API: [https://developer.shipbob.com/webhooks/](https://developer.shipbob.com/webhooks/)
- Shopify Metafields API: [https://shopify.dev/docs/api/admin-rest/2023-10/resources/metafield](https://shopify.dev/docs/api/admin-rest/2023-10/resources/metafield)
- MongoDB Atlas Docs: [https://www.mongodb.com/docs/](https://www.mongodb.com/docs/)
- Render Deployment Guide: [https://render.com/docs/deploy-node-express-app](https://render.com/docs/deploy-node-express-app)

