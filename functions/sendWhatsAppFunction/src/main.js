const fetch = require('node-fetch');

module.exports = async ({ req, res }) => {
  if (req.method === 'POST') {
    try {
      const { recipient, message, imageUrl } = JSON.parse(req.body);

      if (!recipient || !message) {
        return res.json({ success: false, error: 'Recipient and message are required.' }, 400);
      }

      const WAHA_API_URL = process.env.WAHA_API_URL;
      const WAHA_API_KEY = process.env.WAHA_API_KEY;

      if (!WAHA_API_URL || !WAHA_API_KEY) {
        return res.json({ success: false, error: 'WAHA_API_URL or WAHA_API_KEY not set in environment variables.' }, 500);
      }

      const payload = {
        to: recipient,
        body: message,
      };

      if (imageUrl) {
        payload.image = imageUrl;
      }

      const response = await fetch(`${WAHA_API_URL}/api/sendText`, { // Assuming sendText can handle images
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${WAHA_API_KEY}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        return res.json({ success: true, data });
      } else {
        return res.json({ success: false, error: data }, response.status);
      }
    } catch (error) {
      return res.json({ success: false, error: error.message }, 500);
    }
  } else {
    return res.json({ success: false, error: 'Only POST requests are allowed.' }, 405);
  }
};
