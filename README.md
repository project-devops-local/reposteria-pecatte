# reposteria-pecatte

Landing page de **Pecatté** · *Pecados que dan gusto*. Repostería artesanal en vaso.

Sitio estático (un solo `index.html` + carpeta `assets/`) publicado con GitHub Pages.

## Editar

- **WhatsApp de pedidos:** al final de `index.html`, en `const WHATSAPP`, con código de país y solo dígitos (ahora `573203703184`).
- **Precio por vaso:** en `const PRECIO` (ahora `10000`). Se usa en las tarjetas, el pedido y el total del mensaje de WhatsApp.
- **Sabores:** cada `<article class="card">` del menú; la lista de la sección de pedidos se arma sola a partir de ellas. Fotos en `assets/img/sabores/`.
- **Imágenes:** `assets/img/` · **Logos:** `assets/logos/` · **Video:** `assets/video/`.

## Ver en local

```bash
python3 -m http.server 8000
# abre http://localhost:8000
```

## Pruebas responsive (Playwright)

Prueban 13 pantallas (móviles de 320 a 430 px, tablets de 768 a 1024 px, PC de 1280 a 1920 px y pantallas 2K y 4K): sin desbordes ni errores, menú adaptable, tarjetas alineadas, pedido por WhatsApp y video en bucle.

```bash
npm install
npm run serve            # en otra terminal
CHROME_PATH=/usr/bin/google-chrome npm test   # o sin CHROME_PATH tras `npx playwright install chromium`
npm test -- capturas/    # además guarda capturas de página completa en ./capturas
```
