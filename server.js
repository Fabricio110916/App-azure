// server.js - Servidor simples
const express = require('express');
const proxyHandler = require('./api/proxy');

const app = express();
const PORT = process.env.PORT || 3000;

// Aceita qualquer tipo de requisição
app.use(express.raw({ type: '*/*', limit: '100mb' }));
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// CORS livre
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', '*');
  res.header('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Log
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Proxy para tudo
app.all('*', (req, res) => {
  proxyHandler(req, res).catch(err => {
    res.status(500).send(err.message);
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Proxy rodando na porta ${PORT}`);
  console.log(`Passando tráfego para https://my.koom.pp.ua`);
});
