// server.js - Versão com X-Session-ID para DTunnel
const express = require('express');
const crypto = require('crypto');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.text());
app.use(express.raw({ type: '*/*' }));

// Armazena sessões (simples)
const sessions = new Map();

// Gera Session ID único
function generateSessionId() {
  return crypto.randomBytes(16).toString('hex');
}

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  
  // Pega ou cria Session ID
  let sessionId = req.headers['x-session-id'];
  if (!sessionId) {
    sessionId = generateSessionId();
    sessions.set(sessionId, Date.now());
    console.log(`[NOVA SESSÃO] ${sessionId.substring(0, 8)}...`);
  } else {
    // Atualiza timestamp da sessão existente
    if (sessions.has(sessionId)) {
      sessions.set(sessionId, Date.now());
      console.log(`[SESSÃO EXISTENTE] ${sessionId.substring(0, 8)}...`);
    } else {
      sessions.set(sessionId, Date.now());
      console.log(`[SESSÃO REATIVADA] ${sessionId.substring(0, 8)}...`);
    }
  }
  
  // Guarda sessionId para uso posterior
  req.sessionId = sessionId;
  next();
});

app.all('*', async (req, res) => {
  try {
    const targetUrl = `https://137.131.176.224${req.url}`;
    console.log(`[PROXY] ${req.method} ${targetUrl}`);
    console.log(`[PROXY] Session ID enviado: ${req.sessionId.substring(0, 8)}...`);
    
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
    
    const text = await response.text();
    console.log(`[RESPOSTA] Status: ${response.status}`);
    
    // Envia o mesmo Session ID de volta
    res.setHeader('X-Session-ID', req.sessionId);
    res.status(response.status).send(text);
    
  } catch (error) {
    console.error('[ERRO]', error.message);
    res.status(400).json({ 
      error: 'missing X-Session-ID header',
      message: error.message
    });
  }
});

// Limpa sessões antigas a cada 5 minutos
setInterval(() => {
  const now = Date.now();
  let expired = 0;
  for (const [id, timestamp] of sessions.entries()) {
    if (now - timestamp > 30 * 60 * 1000) { // 30 minutos
      sessions.delete(id);
      expired++;
    }
  }
  if (expired > 0) {
    console.log(`[LIMPEZA] ${expired} sessões expiradas. Total ativas: ${sessions.size}`);
  }
}, 5 * 60 * 1000);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Proxy para: https://137.131.176.224`);
});
