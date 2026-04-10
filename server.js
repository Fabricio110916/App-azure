// server.js - Versão estável com suporte a DTunnel
const express = require('express');
const proxyHandler = require('./api/proxy');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware básico
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.raw({ type: '*/*', limit: '10mb' }));

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, X-Session-ID');
  res.header('Access-Control-Expose-Headers', 'X-Session-ID');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Log de requisições
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Rota principal
app.all('*', (req, res) => {
  proxyHandler(req, res).catch(err => {
    console.error('Handler error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  });
});

// Inicia o servidor
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});

server.timeout = 120000; // 2 minutos
