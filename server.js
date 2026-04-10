// server.js - Entry point para Azure App Service (com suporte a XHTTP e DTunnel)
const express = require('express');
const https = require('https');
const proxyHandler = require('./api/proxy');

const app = express();
const PORT = process.env.PORT || 3000;

// Armazena sessões ativas para DTunnel
const sessionStore = new Map();

// Configurações específicas para XHTTP e conexões longas
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.raw({ type: '*/*', limit: '50mb' }));

// Middleware para desabilitar upgrade de protocolo e preparar headers
app.use((req, res, next) => {
  // Remove headers que causam upgrade indesejado
  delete req.headers['upgrade'];
  delete req.headers['upgrade-insecure-requests'];
  
  // Força conexão HTTP/1.1 estável
  req.headers['connection'] = 'keep-alive';
  
  // Preserva o host original para debug
  console.log(`[Server] Requisição recebida: ${req.method} ${req.url}`);
  console.log(`[Server] Headers recebidos:`, Object.keys(req.headers));
  
  next();
});

// Middleware para gerenciamento de sessão DTunnel
app.use((req, res, next) => {
  let sessionId = req.headers['x-session-id'];
  
  if (sessionId && sessionStore.has(sessionId)) {
    // Sessão existente, atualiza timestamp
    sessionStore.set(sessionId, Date.now());
    console.log(`[Session] Sessão ativa: ${sessionId.substring(0, 8)}...`);
  } else if (sessionId) {
    // Nova sessão
    sessionStore.set(sessionId, Date.now());
    console.log(`[Session] Nova sessão criada: ${sessionId.substring(0, 8)}...`);
  }
  
  // Limpa sessões antigas (mais de 30 minutos)
  const now = Date.now();
  let expiredCount = 0;
  for (const [id, timestamp] of sessionStore.entries()) {
    if (now - timestamp > 30 * 60 * 1000) {
      sessionStore.delete(id);
      expiredCount++;
    }
  }
  
  if (expiredCount > 0) {
    console.log(`[Session] ${expiredCount} sessões expiradas removidas. Total ativas: ${sessionStore.size}`);
  }
  
  next();
});

// CORS - Mantém compatibilidade com XHTTP e DTunnel
app.use((req, res, next) => {
  // Headers específicos para XHTTP/DTunnel
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Forwarded-For, X-Real-IP, X-Session-ID');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Expose-Headers', 'Content-Length, X-Request-ID, X-Session-ID');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Rota principal - redireciona para o proxy XHTTP
app.all('*', async (req, res) => {
  try {
    await proxyHandler(req, res);
  } catch (error) {
    console.error(`[Server Error]`, error);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Server error',
        message: error.message
      });
    }
  }
});

// Cria o servidor com configurações para XHTTP
const server = app.listen(PORT, () => {
  console.log(`✅ XHTTP Proxy server running on port ${PORT}`);
  console.log(`📍 Forwarding requests to: https://137.131.176.224:443`);
  console.log(`📡 Protocol: HTTP/1.1 with keep-alive`);
  console.log(`🔒 SSL: Enabled (port 443)`);
  console.log(`🔑 Session management: Active (${sessionStore.size} sessions)`);
});

// Configurações de timeout para suportar XHTTP e conexões longas
server.timeout = 0; // Sem timeout para streaming
server.keepAliveTimeout = 0; // Keep-alive infinito
server.headersTimeout = 65000; // Timeout para headers (65 segundos)

// Tratamento de erros do servidor
server.on('error', (error) => {
  console.error(`[Server Error] ${error.message}`);
});

process.on('uncaughtException', (error) => {
  console.error(`[Uncaught Exception] ${error.message}`);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(`[Unhandled Rejection] at: ${promise}, reason: ${reason}`);
});

// Status da sessão a cada 5 minutos (apenas para monitoramento)
setInterval(() => {
  if (sessionStore.size > 0) {
    console.log(`[Session Monitor] Sessões ativas: ${sessionStore.size}`);
  }
}, 5 * 60 * 1000);
