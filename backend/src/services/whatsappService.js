const axios = require('axios');
const fs = require('fs');
const path = require('path');
const https = require('https');

const BASE_URL = 'https://graph.facebook.com/v18.0';
const CONFIGURED = process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_TOKEN !== 'test'
  && process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_PHONE_NUMBER_ID !== 'test';

if (!CONFIGURED) {
  console.log('WhatsApp service not configured (placeholders detected); Graph API calls will be skipped.');
}

async function sendMessage(to, text) {
  if (!CONFIGURED) return false;
  try {
    const res = await axios.post(
      `${BASE_URL}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: text },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return true;
  } catch (err) {
    console.error('WhatsApp send error:', err.response?.data || err.message);
    return false;
  }
}

async function sendMedia(to, type, mediaId, caption) {
  if (!CONFIGURED) return false;
  try {
    const res = await axios.post(
      `${BASE_URL}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        to,
        type: 'document',
        document: {
          id: mediaId,
          caption: caption || '',
          filename: `${type === 'pdf' ? 'Quotation' : 'Document'}.pdf`,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return true;
  } catch (err) {
    console.error('WhatsApp media send error:', err.response?.data || err.message);
    return false;
  }
}

async function downloadMedia(mediaId, destination) {
  if (!CONFIGURED) return false;
  try {
    const info = await axios.get(`${BASE_URL}/${mediaId}`, {
      headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` },
    });
    const mediaUrl = info.data.url || info.data[0]?.url;
    const media = await axios.get(mediaUrl, {
      headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` },
      responseType: 'arraybuffer',
    });
    const filePath = path.join(destination, `${mediaId}`);
    fs.writeFileSync(filePath, media.data);
    return filePath;
  } catch (err) {
    console.error('WhatsApp download error:', err.response?.data || err.message);
    return false;
  }
}

module.exports = { sendMessage, sendMedia, downloadMedia };