// api/proxy.js - Proxy transparente (passa tudo sem modificar)
module.exports = async function (req, res) {
  const targetUrl = `https://my.koom.pp.ua:443${req.url}`;
  
  try {
    // Remove headers que podem interferir
    const cleanHeaders = {};
    for (const [key, value] of Object.entries(req.headers)) {
      // Filtra headers problemáticos
      if (!['host', 'connection', 'content-length', 'transfer-encoding'].includes(key.toLowerCase())) {
        cleanHeaders[key] = value;
      }
    }
    
    // Adiciona headers corretos
    cleanHeaders['Host'] = 'my.koom.pp.ua';
    
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: cleanHeaders,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : undefined,
      duplex: 'half'
    });
    
    // Passa o status
    res.status(response.status);
    
    // Passa todos os headers
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });
    
    // Passa o corpo
    const data = await response.text();
    res.send(data);
    
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).send(error.message);
  }
};
