// api/proxy.js - Versão com diagnóstico
module.exports = async function (req, res) {
  try {
    const urlPath = req.url;
    
    // LOG 1: Recebemos a requisição
    console.log(`[1] Requisição recebida: ${req.method} ${urlPath}`);
    
    const target = new URL(urlPath, `https://137.131.176.224`);
    target.hostname = '137.131.176.224';
    target.port = '80';
    target.protocol = 'http:';
    
    // LOG 2: Tentando conectar
    console.log(`[2] Tentando conectar a: ${target.toString()}`);
    
    // Opção: tentar HTTP em vez de HTTPS para teste
    // Descomente a linha abaixo para testar com HTTP:
    // target.protocol = 'http:'; target.port = '80';
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos timeout
    
    const response = await fetch(target.toString(), {
      method: req.method,
      headers: {
        ...req.headers,
        'Host': '137.131.176.224'
      },
      body: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : undefined,
      signal: controller.signal
    }).catch(err => {
      console.log(`[3] ERRO DETALHADO:`, {
        name: err.name,
        message: err.message,
        code: err.code,
        cause: err.cause
      });
      throw err;
    });
    
    clearTimeout(timeoutId);
    
    // LOG 3: Conexão bem sucedida
    console.log(`[3] Conexão OK! Status: ${response.status}`);
    
    res.status(response.status);
    response.headers.forEach((value, key) => {
      if (!['content-encoding', 'transfer-encoding'].includes(key)) {
        res.setHeader(key, value);
      }
    });
    
    const data = await response.text();
    res.send(data);
    
  } catch (error) {
    console.error(`[ERRO FINAL]`, {
      message: error.message,
      code: error.code,
      cause: error.cause?.message
    });
    
    res.status(500).json({ 
      error: 'Proxy failed', 
      message: error.message,
      code: error.code || 'unknown',
      details: error.cause?.message || 'Verifique se o destino está acessível'
    });
  }
};
