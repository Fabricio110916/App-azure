// server.js - Versão que funcionava (retornava 400)
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.text());
app.use(express.raw({ type: '*/*' }));

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

app.all('*', async (req, res) => {
  try {
    const targetUrl = `https://137.131.176.224${req.url}`;
    console.log(`Proxying to: ${targetUrl}`);
    
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Host': '137.131.176.224'
      }
    });
    
    const text = await response.text();
    res.status(response.status).send(text);
    
  } catch (error) {
    console.error('Proxy error:', error.message);
    // Retorna 400 em vez de 500 para simular o servidor XHTTP
    res.status(400).json({ 
      error: 'missing X-Session-ID header',
      message: error.message
    });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
