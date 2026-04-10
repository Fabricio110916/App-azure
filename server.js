// server.js - Versão final com porta 443 explícita e XHTTP correto
const express = require('express');
const crypto = require('crypto');
const https = require('https');
const http = require('http');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.text());
app.use(express.raw({ type: '*/*' }));

const sessions = new Map();

function generateSessionId() {
  return crypto.randomBytes(16).toString('hex');
}

// Log de requisições
app.use((req, res, next) => {
  console.log(`[REQ] ${req.method} ${req.url}`);
  next();
});

// Middleware de sessão
app.use((req, res, next) => {
  let sessionId = req.headers['x-session-id'];
  if (!sessionId) {
    sessionId = generateSessionId();
    sessions.set(sessionId, Date.now());
    console.log(`[NOVA SESSÃO] ${sessionId.substring(0, 8)}...`);
  } else {
    if (!sessions.has(sessionId)) {
      sessions.set(sessionId, Date.now());
      console.log(`[SESSÃO NOVA] ${sessionId.substring(0, 8)}...`);
    } else {
      sessions.set(sessionId, Date.now());
      console.log(`[SESSÃO EXISTENTE] ${sessionId.substring(0, 8)}...`);
    }
  }
  req.sessionId = sessionId;
  next();
});

// Proxy principal
app.all('*', async (req, res) => {
  // Constrói a URL com PORTA 443 EXPLÍCITA
  const targetUrl = `https://137.131.176.224:443${req.url}`;
  
  console.log(`[PROXY] ${req.method} → ${targetUrl}`);
  console.log(`[PROXY] Session ID: ${req.sessionId.substring(0, 8)}...`);
  
  // Headers que o XHTTP espera
  const headers = {
    'Host': '137.131.176.224',
    'X-Session-ID': req.sessionId,
    'User-Agent': req.headers['user-agent'] || 'DTunnel/4.5.12',
    'Accept': req.headers['accept'] || '*/*',
    'Accept-Encoding': req.headers['accept-encoding'] || 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Cache-Control': 'no-cache'
  };
  
  // Copia headers importantes do request original
  if (req.headers['content-type']) {
    headers['Content-Type'] = req.headers['content-type'];
  }
  
  if (req.headers['content-length']) {
    headers['Content-Length'] = req.headers['content-length'];
  }
  
  // Prepara o body (se existir)
  let body = null;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    body = req.body;
    if (typeof body === 'object' && !Buffer.isBuffer(body)) {
      body = JSON.stringify(body);
    }
  }
  
  try {
    // Opções do fetch com timeout e SSL mais permissivo
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: headers,
      body: body,
      signal: controller.signal,
      // Ignora erros de SSL (para testes)
      agent: new https.Agent({ rejectUnauthorized: false })
    });
    
    clearTimeout(timeoutId);
    
    console.log(`[RESPONSE] Status: ${response.status} ${response.statusText}`);
    
    // Lê a resposta como buffer binário
    const buffer = await response.arrayBuffer();
    
    // Repassa o status (incluindo 400)
    res.status(response.status);
    
    // Repassa headers importantes da resposta
    response.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      // Preserva headers importantes para XHTTP
      if (!['content-encoding', 'transfer-encoding'].includes(lowerKey)) {
        res.setHeader(key, value);
      }
    });
    
    // Garante que o X-Session-ID seja enviado de volta
    res.setHeader('X-Session-ID', req.sessionId);
    
    // Envia a resposta
    res.send(Buffer.from(buffer));
    
  } catch (error) {
    console.error(`[ERROR] ${error.message}`);
    // Para XHTTP, retorna 400 com a mensagem esperada
    res.status(400).json({ 
      error: 'missing X-Session-ID header',
      message: error.message
    });
  }
});

// Limpeza de sessões (a cada 5 minutos)
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
    console.log(`[CLEANUP] ${expired} sessões removidas. Ativas: ${sessions.size}`);
  }
}, 5 * 60 * 1000);

// Inicia o servidor
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ XHTTP Proxy rodando na porta ${PORT}`);
  console.log(`📍 Destino: https://137.131.176.224:443`);
  console.log(`🔑 Gerenciamento de sessão ativo`);
});

// Timeouts para XHTTP
server.timeout = 0;
server.keepAliveTimeout = 0;
