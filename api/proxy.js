// api/proxy.js - Versão estável
module.exports = async function (req, res) {
  try {
    const url = `https://137.131.176.224${req.url}`;
    
    console.log(`Proxying: ${req.method} ${url}`);
    
    const response = await fetch(url, {
      method: req.method,
      headers: {
        'host': '137.131.176.224',
        'user-agent': req.headers['user-agent'] || 'Azure-Proxy',
        'content-type': req.headers['content-type'] || 'application/json',
        'x-session-id': req.headers['x-session-id'] || generateSessionId()
      },
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined
    });
    
    const data = await response.text();
    
    res.status(response.status);
    res.setHeader('X-Session-ID', req.headers['x-session-id']);
    res.send(data);
    
  } catch (error) {
    console.error('Proxy error:', error.message);
    res.status(500).json({ 
      error: 'Proxy failed', 
      message: error.message 
    });
  }
};

function generateSessionId() {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}
