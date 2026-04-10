// server.js - Versão correta para XHTTP (400 não é erro)
const express = require('express');
const crypto = require('crypto');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.text());
app.use(express.raw({ type: '*/*' }));

const sessions = new Map();

function generateSessionId() {
  return crypto.randomBytes(16).toString('hex');
}

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  
  let sessionId = req.headers['x-session-id'];
  if (!sessionId) {
    sessionId = generateSessionId();
    sessions.set(sessionId, Date.now());
  } else if (!sessions.has(sessionId)) {
    sessions.set(sessionId, Date.now());
  } else {
    sessions.set(sessionId, Date.now());
  }
  
  req.sessionId = sessionId;
  next();
});

app.all('*', async (req, res) => {
  try {
    const targetUrl = `https://137.131.176.224${req.url}`;
    
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Host': '137.131.176.224',
        'X-Session-ID': req.sessionId,
        'User-Agent': req.headers['user-agent'] || 'DTunnel/4.5.12',
        'Content-Type': req.headers['content-type'] || 'application/octet-stream',
        'Connection': 'keep-alive'
      },
      body: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : undefined
    });
    
    // Lê a resposta como buffer/binário (importante para XHTTP)
    const buffer = await response.arrayBuffer();
    
    // Repassa o status EXATAMENTE como veio (incluindo 400)
    res.status(response.status);
    
    // Repassa todos os headers
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });
    
    // Garante o Session ID na resposta
    res.setHeader('X-Session-ID', req.sessionId);
    
    // Envia o corpo binário
    res.send(Buffer.from(buffer));
    
  } catch (error) {
    // Só trata erro de CONEXÃO, não erro HTTP
    console.error('[CONNECTION ERROR]', error.message);
    res.status(500).send(error.message);
  }
});

// Limpa sessões antigas
setInterval(() => {
  const now = Date.now();
  for (const [id, timestamp] of sessions.entries()) {
    if (now - timestamp > 30 * 60 * 1000) {
      sessions.delete(id);
    }
  }
}, 5 * 60 * 1000);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`XHTTP Proxy running on port ${PORT}`);
  console.log(`Forwarding to: https://137.131.176.224`);
});
