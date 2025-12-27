# app-annetom-webview (Vite + PWA)

Front-end em React para **app.annetom.com**, pensado para rodar dentro de um WebView Android.

- Build com **Vite**
- Estilização com **Tailwind CSS**
- **PWA** com `vite-plugin-pwa`
- Fluxo:
  - Login/registro via WhatsApp
  - Cardápio
  - Carrinho/Checkout
  - Rastreamento do pedido
  - Meus pedidos + fidelidade
  - Roleta de descontos para novos clientes

## Scripts

```bash
npm install
npm run dev      # ambiente de desenvolvimento
npm run build    # build de produção
npm run preview  # servidor de preview do build
```

## Observações

- A entrada principal é `index.html` apontando para `/src/index.jsx`.
- Durante `npm run dev`/`npm run preview` o Vite tenta usar `5173`/`4173` (ou os valores de `VITE_DEV_PORT`/`VITE_PREVIEW_PORT`/`PORT`) e, se o porto estiver ocupado, escolhe o próximo disponível automaticamente.
- O service worker e manifest são gerados automaticamente pelo `vite-plugin-pwa` no build.
- Variáveis ambientais usadas no front-end:
  - `VITE_AT_API_BASE_URL`, `VITE_AT_API_KEY`, `VITE_PUBLIC_API_TOKEN` apontam para a API da Anne & Tom.
  - `VITE_GOOGLE_MAPS_API_KEY` e `VITE_DELIVERY_ORIGIN` alimentam o cálculo de ETA no checkout.
- Copie `.env.example` para `.env.local` (ou use outro `.env.*`) e ajuste os valores sensíveis antes de rodar `npm run dev`/`npm run build`.
- Se você já tem `SYNC_TOKEN` ou `PUBLIC_API_TOKEN` definidos, o código também os aceita como fallback para `VITE_AT_API_KEY` e `VITE_PUBLIC_API_TOKEN`.
- O checkout agora aplica a taxa de entrega por distância (km) usando uma tabela padrão baseada na resposta do Google Distance Matrix, com fallback por bairro quando o cálculo não estiver disponível.
