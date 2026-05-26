const https = require('https');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const API_KEY = process.env.GHL_API_KEY;
  const LOCATION_ID = process.env.GHL_LOCATION_ID;
  if (!API_KEY) return res.status(500).json({ error: 'GHL_API_KEY not set' });
  if (!LOCATION_ID) return res.status(500).json({ error: 'GHL_LOCATION_ID not set' });

  try {
    // Fetch up to 3 pages of 100 contacts = 300 contacts
    let allContacts = [];
    let page = 1;
    while (page <= 3) {
      const data = await ghlFetch(
        `/contacts/?locationId=${LOCATION_ID}&limit=100&page=${page}&sortBy=lastName&sortOrder=asc`,
        API_KEY
      );
      const batch = data.contacts || [];
      allContacts = allContacts.concat(batch);
      if (batch.length < 100) break;
      page++;
    }
    res.json({ contacts: allContacts });
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
