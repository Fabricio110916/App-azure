// api/proxy.js - Solução definitiva para XHTTP no Azure
// IMPORTANTE: Ignora erros de certificado SSL (necessário para alguns servidores)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

module.exports = async function (req, res) {
  try {
    const urlPath = req.url;
    const target = new URL(urlPath, `https://137.131.176.224`);
    target.hostname = '137.131.176.224';
    target.port = '443';
    target.protocol = 'https:';

    // Headers essenciais para o servidor XHTTP
    const forwardedHeaders = {
      'host': '137.131.176.224',
      'x-forwarded-for': req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      'x-forwarded-proto': 'https',
      'x-forwarded-host': req.headers.host,
      'x-real-ip': req.socket.remoteAddress,
      'user-agent': req.headers['user-agent'] || 'XHTTP-Client',
      'accept': req.headers['accept'] || '*/*',
      'connection': 'keep-alive',
      'accept-encoding': 'gzip, deflate, br'
    };

    // Headers que não devem ser repassados
    const headersToRemove = ['host', 'connection', 'content-length', 'transfer-encoding', 'upgrade', 'upgrade-insecure-requests'];
    const filteredHeaders = { ...req.headers };
    headersToRemove.forEach(header => delete filteredHeaders[header]);

    // Combina os headers
    const finalHeaders = { ...forwardedHeaders, ...filteredHeaders };

    const fetchOptions = {
      method: req.method,
      headers: finalHeaders,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : undefined,
      duplex: 'half',
      // Timeout generoso para XHTTP
      signal: AbortSignal.timeout(60000)
    };

    console.log(`[XHTTP Proxy] ${req.method} ${target.toString()}`);
    const response = await fetch(target.toString(), fetchOptions);

    console.log(`[XHTTP Proxy] Response: ${response.status} ${response.statusText}`);

    // Repassa os headers da resposta
    res.status(response.status);
    response.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      if (!['content-encoding', 'transfer-encoding'].includes(lowerKey)) {
        res.setHeader(key, value);
      }
    });

    const data = await response.text();
    res.send(data);
    
  } catch (error) {
    console.error(`[XHTTP Proxy Error]`, error);
    res.status(500).json({ 
      error: 'XHTTP Proxy failed', 
      message: error.message,
      hint: 'Verifique se o servidor XHTTP está aceitando conexões externas'
    });
  }
};
