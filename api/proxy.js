// api/proxy.js - Com X-Session-ID fixo para DTunnel
const crypto = require('crypto');

// Armazena sessões em memória (simples, sem Map complexo)
let activeSessions = {};

module.exports = async function (req, res) {
  try {
    // Pega ou cria o Session ID
    let sessionId = req.headers['x-session-id'];
    
    if (!sessionId) {
      sessionId = crypto.randomBytes(16).toString('hex');
      activeSessions[sessionId] = Date.now();
      console.log(`[SESSION] Nova sessão: ${sessionId.substring(0, 8)}...`);
    } else {
      // Atualiza timestamp da sessão existente
      if (activeSessions[sessionId]) {
        activeSessions[sessionId] = Date.now();
      } else {
        activeSessions[sessionId] = Date.now();
        console.log(`[SESSION] Sessão reativada: ${sessionId.substring(0, 8)}...`);
      }
    }
    
    // Limpa sessões antigas (30 minutos)
    const now = Date.now();
    for (const [id, timestamp] of Object.entries(activeSessions)) {
      if (now - timestamp > 30 * 60 * 1000) {
        delete activeSessions[id];
        console.log(`[SESSION] Sessão expirada: ${id.substring(0, 8)}...`);
      }
    }
    
    // Constrói a URL de destino
    const targetUrl = `https://137.131.176.224${req.url}`;
    
    console.log(`[PROXY] ${req.method} ${targetUrl}`);
    console.log(`[PROXY] Session ID: ${sessionId.substring(0, 8)}...`);
    
    // Prepara os headers
    const headers = {
      'Host': '137.131.176.224',
      'X-Session-ID': sessionId,
      'User-Agent': req.headers['user-agent'] || 'DTunnel-Client/4.5',
      'Accept': req.headers['accept'] || '*/*',
      'Accept-Encoding': req.headers['accept-encoding'] || 'gzip, deflate, br',
      'Connection': 'keep-alive'
    };
    
    // Copia headers relevantes do request original
    if (req.headers['content-type']) {
      headers['Content-Type'] = req.headers['content-type'];
    }
    
    if (req.headers['authorization']) {
      headers['Authorization'] = req.headers['authorization'];
    }
    
    // Prepara o body
    let body = undefined;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      body = req.body;
      if (typeof body === 'object') {
        body = JSON.stringify(body);
        headers['Content-Type'] = 'application/json';
      }
    }
    
    // Faz a requisição
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: headers,
      body: body,
      timeout: 30000
    });
    
    console.log(`[PROXY] Response: ${response.status}`);
    
    // Lê a resposta
    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }
    
    // Envia a resposta
    res.status(response.status);
    res.setHeader('X-Session-ID', sessionId);
    res.setHeader('Content-Type', contentType || 'application/json');
    res.send(data);
    
  } catch (error) {
    console.error(`[PROXY ERROR]`, error.message);
    res.status(500).json({
      error: 'Proxy failed',
      message: error.message,
      sessionId: req.headers['x-session-id'] || 'new session needed'
    });
  }
};
