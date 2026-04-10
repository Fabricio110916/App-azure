// server.js - Versão estável e simplificada
const express = require('express');
const proxyHandler = require('./api/proxy');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware básico
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS básico
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Log simples
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Rota principal
app.all('*', async (req, res) => {
  try {
    await proxyHandler(req, res);
  } catch (error) {
    console.error('Erro:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Inicia o servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
