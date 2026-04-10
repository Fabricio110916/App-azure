// api/proxy.js - Proxy para XHTTP/DTunnel
const crypto = require('crypto');
const https = require('https');

// Agente HTTPS que ignora erros de SSL
const agent = new https.Agent({
  rejectUnauthorized: false,
  keepAlive: true
});

// Armazena sessões
const sessions = new Map();

function generateSessionId() {
  return crypto.randomBytes(16).toString('hex');
}

module.exports = async function (req, res) {
  // Pega ou cria Session ID
  let sessionId = req.headers['x-session-id'];
  if (!sessionId) {
    sessionId = generateSessionId();
    sessions.set(sessionId, Date.now());
    console.log(`[SESSION] Criada: ${sessionId.substring(0, 8)}...`);
  } else {
    sessions.set(sessionId, Date.now());
    console.log(`[SESSION] Usando: ${sessionId.substring(0, 8)}...`);
  }
  
  // Constrói URL com porta 443 explícita
  const targetUrl = `https://137.131.176.224:443${req.url}`;
  console.log(`[PROXY] ${req.method} ${targetUrl}`);
  
  // Headers para XHTTP
  const headers = {
    'Host': '137.131.176.224',
    'X-Session-ID': sessionId,
    'User-Agent': req.headers['user-agent'] || 'DTunnel/4.5.12',
    'Accept': '*/*',
    'Connection': 'keep-alive',
    'Cache-Control': 'no-cache'
  };
  
  // Copia content-type se existir
  if (req.headers['content-type']) {
    headers['Content-Type'] = req.headers['content-type'];
  }
  
  // Prepara o body
  let body = undefined;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    body = req.body;
    if (typeof body === 'object' && !Buffer.isBuffer(body)) {
      body = JSON.stringify(body);
    }
  }
  
  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: headers,
      body: body,
      agent: agent,
      timeout: 30000
    });
    
    console.log(`[RESPONSE] Status: ${response.status}`);
    
    // Lê a resposta como buffer
    const buffer = await response.arrayBuffer();
    
    // Repassa o status (incluindo 400)
    res.status(response.status);
    
    // Repassa headers
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });
    
    // Garante o X-Session-ID na resposta
    res.setHeader('X-Session-ID', sessionId);
    
    // Envia a resposta
    res.send(Buffer.from(buffer));
    
  } catch (error) {
    console.error(`[ERROR] ${error.message}`);
    // Retorna 400 como o XHTTP espera
    res.status(400).json({ 
      error: 'missing X-Session-ID header',
      message: error.message
    });
  }
};

// Limpa sessões antigas a cada 5 minutos
setInterval(() => {
  const now = Date.now();
  let expired = 0;
  for (const [id, timestamp] of sessions.entries()) {
    if (now - timestamp > 30 * 60 * 1000) {
      sessions.delete(id);
      expired++;
    }
  }
  if (expired > 0) {
    console.log(`[CLEANUP] ${expired} sessões expiradas. Ativas: ${sessions.size}`);
  }
}, 5 * 60 * 1000);
