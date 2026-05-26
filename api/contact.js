const https = require('https');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { contactId } = req.query;
  if (!contactId) return res.status(400).json({ error: 'contactId required' });

  const API_KEY = process.env.GHL_API_KEY;
  const LOCATION_ID = process.env.GHL_LOCATION_ID;

  if (!API_KEY) return res.status(500).json({ error: 'GHL_API_KEY not set' });
  if (!LOCATION_ID) return res.status(500).json({ error: 'GHL_LOCATION_ID not set' });

  try {
    const contact = await ghlFetch(`/contacts/${contactId}`, API_KEY);
    let opps = { opportunities: [] };
    try {
      opps = await ghlFetch(`/opportunities/search?contact_id=${contactId}&location_id=${LOCATION_ID}`, API_KEY);
    } catch(e) {}
    res.json({ contact, opps });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

function ghlFetch(path, apiKey) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'services.leadconnectorhq.com',
      path,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Version': '2021-07-28',
        'Content-Type': 'application/json'
      }
    };
    const reqHttp = https.request(options, (response) => {
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (response.statusCode >= 400) reject(new Error(`API error ${response.statusCode}: ${JSON.stringify(parsed)}`));
          else resolve(parsed);
        } catch (e) { reject(new Error('Invalid JSON response')); }
      });
    });
    reqHttp.on('error', reject);
    reqHttp.end();
  });
}
