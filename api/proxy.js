import { NextRequest } from "next/server";

export const config = {
  runtime: "edge", // roda na Edge Function
};

export default async function handler(req: NextRequest) {
  const url = new URL(req.url);

  // Monta a URL de destino no seu servidor
  const target = `http://deta.titania.pp.ua${url.pathname}${url.search}`;

  // Repassa a requisição original
  const response = await fetch(target, {
    method: req.method,
    headers: req.headers,
    body: req.method !== "GET" && req.method !== "HEAD" ? req.body : undefined,
  });

  // Retorna a resposta original para o cliente
  return new Response(response.body, {
    status: response.status,
    headers: response.headers,
  });
}
