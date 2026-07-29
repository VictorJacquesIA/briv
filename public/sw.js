self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Passthrough puro — sem cache. Este app é um dashboard de CRUD ao vivo
// contra o Supabase; qualquer estratégia de cache aqui arrisca mostrar
// dados de compra/estoque desatualizados. O listener existe só para
// satisfazer o critério de "tem service worker com fetch handler ativo"
// usado por alguns navegadores/OS na instalabilidade.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(fetch(event.request));
});
