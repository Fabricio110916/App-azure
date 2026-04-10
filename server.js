// server.js - Versão mínima garantida
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.text());
app.use(express.raw({ type: '*/*' }));

// Log de tudo
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Rota de teste
app.get('/test', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Proxy simples
app.all('*', async (req, res) => {
  try {
    const targetUrl = `https://137.131.176.224${req.url}`;
    console.log(`Proxying to: ${targetUrl}`);
    
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Host': '137.131.176.224',
        'X-Session-ID': req.headers['x-session-id'] || 'test-session-123'
      }
    });
    
    const text = await response.text();
    res.status(response.status).send(text);
    
  } catch (error) {
    console.error('Proxy error:', error.message);
    res.status(500).json({ 
      error: error.message,
      url: `https://137.131.176.224${req.url}`
    });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
