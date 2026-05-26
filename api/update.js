const https = require('https');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { contactId } = req.query;
  if (!contactId) return res.status(400).json({ error: 'contactId required' });

  const API_KEY = process.env.GHL_API_KEY;
  if (!API_KEY) return res.status(500).json({ error: 'GHL_API_KEY not set' });

  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', async () => {
    try {
      const payload = JSON.parse(body);
      const result = await ghlPut(`/contacts/${contactId}`, API_KEY, payload);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
};

function ghlPut(path, apiKey, data) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(data);
    const options = {
      hostname: 'services.leadconnectorhq.com',
      path,
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Version': '2021-07-28',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr)
      }
    };
    const reqHttp = https.request(options, (response) => {
      let resData = '';
      response.on('data', chunk => resData += chunk);
      response.on('end', () => {
        try {
          const parsed = JSON.parse(resData);
          if (response.statusCode >= 400) reject(new Error(`API error ${response.statusCode}: ${JSON.stringify(parsed)}`));
          else resolve(parsed);
        } catch (e) { reject(new Error('Invalid JSON response')); }
      });
    });
    reqHttp.on('error', reject);
    reqHttp.write(bodyStr);
    reqHttp.end();
  });
}
