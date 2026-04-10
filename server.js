// server.js - Entry point para Azure App Service (com suporte a XHTTP)
const express = require('express');
const https = require('https');
const proxyHandler = require('./api/proxy');

const app = express();
const PORT = process.env.PORT || 3000;

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

// CORS - Mantém compatibilidade com XHTTP
app.use((req, res, next) => {
  // Headers específicos para XHTTP
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Forwarded-For, X-Real-IP');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Expose-Headers', 'Content-Length, X-Request-ID');
  
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
