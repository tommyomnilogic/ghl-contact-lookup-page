const https = require('https');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { contactId } = req.query;
  if (!contactId) return res.status(400).json({ error: 'contactId required' });

  const API_KEY = process.env.GHL_API_KEY;
  if (!API_KEY) return res.status(500).json({ error: 'GHL_API_KEY not set' });

  // GET - fetch notes
  if (req.method === 'GET') {
    try {
      const data = await ghlFetch(`/contacts/${contactId}/notes`, API_KEY);
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
    return;
  }

  // POST - add a note
  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { body: noteBody, userId } = JSON.parse(body);
        const result = await ghlPost(`/contacts/${contactId}/notes`, API_KEY, { body: noteBody, userId });
        res.json(result);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
};

function ghlFetch(path, apiKey) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'services.leadconnectorhq.com',
      path,
      method: 'GET',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Version': '2021-07-28', 'Content-Type': 'application/json' }
    };
    const r = https.request(options, (response) => {
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (response.statusCode >= 400) reject(new Error(`API error ${response.statusCode}: ${JSON.stringify(parsed)}`));
          else resolve(parsed);
        } catch (e) { reject(new Error('Invalid JSON')); }
      });
    });
    r.on('error', reject);
    r.end();
  });
}

function ghlPost(path, apiKey, data) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(data);
    const options = {
      hostname: 'services.leadconnectorhq.com',
      path,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Version': '2021-07-28',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr)
      }
    };
    const r = https.request(options, (response) => {
      let resData = '';
      response.on('data', chunk => resData += chunk);
      response.on('end', () => {
        try {
          const parsed = JSON.parse(resData);
          if (response.statusCode >= 400) reject(new Error(`API error ${response.statusCode}: ${JSON.stringify(parsed)}`));
          else resolve(parsed);
        } catch (e) { reject(new Error('Invalid JSON')); }
      });
    });
    r.on('error', reject);
    r.write(bodyStr);
    r.end();
  });
}
