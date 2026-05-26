const https = require('https');
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { contactId } = req.query;
  if (!contactId) return res.status(400).json({ error: 'contactId required' });
  const API_KEY = process.env.GHL_API_KEY;
  const LOCATION_ID = process.env.GHL_LOCATION_ID;
  if (!API_KEY) return res.status(500).json({ error: 'GHL_API_KEY not set' });
  try {
    const convSearch = await ghlFetch('/conversations/search?contactId=' + contactId + '&locationId=' + LOCATION_ID + '&limit=20', API_KEY);
    const conversations = convSearch.conversations || convSearch.data || [];
    if (!conversations.length) return res.json({ messages: [] });
    const allMessages = [];
    for (const conv of conversations.slice(0, 5)) {
      try {
        const msgData = await ghlFetch('/conversations/' + conv.id + '/messages?limit=25', API_KEY);
        const msgs = msgData.messages?.messages || msgData.messages || [];
        allMessages.push(...msgs);
      } catch(e) {}
    }
    allMessages.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
    res.json({ messages: allMessages.slice(0, 50) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
function ghlFetch(path, apiKey) {
  return new Promise((resolve, reject) => {
    const options = { hostname: 'services.leadconnectorhq.com', path, method: 'GET', headers: { 'Authorization': 'Bearer ' + apiKey, 'Version': '2021-07-28', 'Content-Type': 'application/json' } };
    const r = https.request(options, (response) => {
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (response.statusCode >= 400) reject(new Error('API error ' + response.statusCode + ': ' + JSON.stringify(parsed)));
          else resolve(parsed);
        } catch (e) { reject(new Error('Invalid JSON')); }
      });
    });
    r.on('error', reject);
    r.end();
  });
}
