// api/proxy.js - Versão para XHTTP na porta 443
module.exports = async function (req, res) {
  try {
    const urlPath = req.url;
    
    // Mantém HTTPS e porta 443
    const target = new URL(urlPath, `https://137.131.176.224`);
    target.hostname = '137.131.176.224';
    target.port = '443';
    target.protocol = 'https:';

    // Headers essenciais para XHTTP
    const forwardedHeaders = {
      // Preserva o host original que o servidor espera
      'host': '137.131.176.224',
      'x-forwarded-for': req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      'x-forwarded-proto': 'https',
      'x-forwarded-host': req.headers.host,
      'x-real-ip': req.socket.remoteAddress,
      // Mantém headers originais importantes
      'user-agent': req.headers['user-agent'] || 'XHTTP-Client',
      'accept': req.headers['accept'] || '*/*',
      'accept-encoding': req.headers['accept-encoding'] || 'gzip, deflate, br',
      'connection': 'keep-alive'
    };

    // Headers que NÃO devem ser repassados
    const blockedHeaders = ['host', 'content-length', 'transfer-encoding'];
    
    const filteredHeaders = { ...req.headers };
    blockedHeaders.forEach(header => delete filteredHeaders[header]);
    
    // Combina os headers
    const finalHeaders = { ...forwardedHeaders, ...filteredHeaders };

    // Configuração específica para XHTTP
    const fetchOptions = {
      method: req.method,
      headers: finalHeaders,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : undefined,
      // Importante para XHTTP
      duplex: 'half',
      // Ignora SSL se necessário (para teste)
      // agent: new https.Agent({ rejectUnauthorized: false })
    };

    console.log(`[XHTTP Proxy] ${req.method} ${target.toString()}`);
    console.log(`[XHTTP Proxy] Headers:`, Object.keys(finalHeaders));

    const response = await fetch(target.toString(), fetchOptions);

    // Log do status para debug
    console.log(`[XHTTP Proxy] Response: ${response.status} ${response.statusText}`);

    // Se for 400, log mais detalhes
    if (response.status === 400) {
      const errorText = await response.text();
      console.log(`[XHTTP Proxy] 400 Error body:`, errorText);
    }

    // Repassa headers da resposta
    res.status(response.status);
    response.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      // Preserva headers importantes para XHTTP
      if (!['content-encoding', 'transfer-encoding'].includes(lowerKey)) {
        res.setHeader(key, value);
      }
    });

    // Para respostas 400, retorna o corpo original do servidor
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
