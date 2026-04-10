// api/proxy.js - Versão com suporte a X-Session-ID para DTunnel
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

module.exports = async function (req, res) {
  try {
    const urlPath = req.url;
    const target = new URL(urlPath, `https://137.131.176.224`);
    target.hostname = '137.131.176.224';
    target.port = '443';
    target.protocol = 'https:';

    // Gera ou mantém o X-Session-ID
    let sessionId = req.headers['x-session-id'];
    if (!sessionId) {
      // Gera um ID de sessão único se não existir
      sessionId = generateSessionId();
      console.log(`[XHTTP] Nova sessão gerada: ${sessionId}`);
    }

    // Headers essenciais para DTunnel XHTTP
    const requiredHeaders = {
      'host': '137.131.176.224',
      'x-session-id': sessionId,  // ← CRÍTICO para DTunnel
      'x-forwarded-for': req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      'x-forwarded-proto': 'https',
      'x-real-ip': req.socket.remoteAddress,
      'user-agent': 'DTunnel/4.5.12',
      'connection': 'keep-alive',
      'accept': '*/*',
      'accept-encoding': 'gzip, deflate, br',
      'cache-control': 'no-cache',
      'pragma': 'no-cache'
    };

    // Headers que não devem ser repassados
    const headersToRemove = ['host', 'connection', 'content-length', 'transfer-encoding', 'upgrade'];
    const filteredHeaders = { ...req.headers };
    headersToRemove.forEach(header => delete filteredHeaders[header]);

    // Combina os headers (prioriza os requeridos)
    const finalHeaders = { ...filteredHeaders, ...requiredHeaders };

    console.log(`[XHTTP] ${req.method} ${target.pathname}`);
    console.log(`[XHTTP] Session ID: ${sessionId.substring(0, 8)}...`);

    const fetchOptions = {
      method: req.method,
      headers: finalHeaders,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : undefined,
      duplex: 'half',
      signal: AbortSignal.timeout(120000) // 2 minutos para DTunnel
    };

    const response = await fetch(target.toString(), fetchOptions);

    // Preserva o X-Session-ID na resposta
    const responseSessionId = response.headers.get('x-session-id');
    if (responseSessionId) {
      console.log(`[XHTTP] Servidor respondeu com Session ID: ${responseSessionId.substring(0, 8)}...`);
    }

    console.log(`[XHTTP] Response: ${response.status}`);

    // Configura headers da resposta
    res.status(response.status);
    response.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      if (!['content-encoding', 'transfer-encoding'].includes(lowerKey)) {
        res.setHeader(key, value);
      }
    });
    
    // Garante que o X-Session-ID seja enviado de volta
    res.setHeader('X-Session-ID', sessionId);

    const data = await response.text();
    res.send(data);
    
  } catch (error) {
    console.error(`[XHTTP Error]`, error);
    res.status(500).json({ 
      error: 'XHTTP Proxy failed', 
      message: error.message,
      hint: 'Verifique X-Session-ID'
    });
  }
};

// Função para gerar Session ID compatível com DTunnel
function generateSessionId() {
  const crypto = require('crypto');
  // Gera um ID de 32 caracteres hex (formato comum para session IDs)
  return crypto.randomBytes(16).toString('hex').toUpperCase();
}
