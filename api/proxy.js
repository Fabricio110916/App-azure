// api/proxy.js - Versão para Azure App Service (Node.js)
module.exports = async function (req, res) {
  try {
    const urlPath = req.url;
    const target = new URL(urlPath, `https://137.131.176.224`);
    target.hostname = '137.131.176.224';
    target.port = '443';
    target.protocol = 'https:';

    const filteredHeaders = { ...req.headers };
    const headersToRemove = ['host', 'connection', 'content-length', 'expect'];
    headersToRemove.forEach(header => delete filteredHeaders[header]);

    const fetchOptions = {
      method: req.method,
      headers: filteredHeaders,
    };

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      fetchOptions.body = req;
      fetchOptions.duplex = 'half';
    }

    const response = await fetch(target.toString(), fetchOptions);

    res.status(response.status);
    response.headers.forEach((value, key) => {
      if (!['content-encoding', 'transfer-encoding'].includes(key)) {
        res.setHeader(key, value);
      }
    });

    const data = await response.text();
    res.send(data);
    
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ 
      error: 'Proxy failed', 
      message: error.message 
    });
  }
};
