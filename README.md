# Desbloquear premios para vender más

App para Tiendanube que muestra una barra de progreso en el carrito. A medida que el cliente suma productos, se desbloquean premios configurables (envío gratis, descuentos, regalos, etc.).

**App ID Tiendanube:** `33285`

## Stack

- Node.js + Express
- PostgreSQL
- OAuth 2.0 Tiendanube
- Widget JavaScript inyectado en el storefront

## Inicio rápido

```bash
cp .env.example .env
# Completar TIENDANUBE_CLIENT_SECRET y DATABASE_URL

docker compose up -d
npm install
npm run db:migrate
npm run dev
```

Servidor: http://localhost:3000  
Panel admin: http://localhost:3000/admin  
Instalar app: http://localhost:3000/auth/install

## Configuración en Partner Portal

1. Crear/configurar la app con ID **33285**
2. **Redirect URL:** `http://localhost:3000/auth/callback` (producción: tu dominio HTTPS)
3. **App URL:** `http://localhost:3000/admin`
4. **Preferences URL:** `http://localhost:3000/admin`
5. **Scopes:** `write_scripts` (mínimo), opcionalmente `read_orders`
6. Crear un **Script** en el portal:
   - Location: `store`
   - Event: `onfirstinteraction`
   - Auto installed: `false` (el backend asocia el script al instalar)
   - Subir `public/widget/rewards-bar.js` como versión
7. Copiar el **Script ID** a `TIENDANUBE_SCRIPT_ID` en `.env`

### Webhooks (GDPR)

| Evento | URL |
|--------|-----|
| Store redact | `/webhooks/store/redact` |
| Customer redact | `/webhooks/customers/redact` |
| Customer data request | `/webhooks/customers/data_request` |
| App uninstalled | `/webhooks/app/uninstalled` |

## Estructura del proyecto

```
desbloquear-premios/
├── src/
│   ├── index.js              # Entry point
│   ├── app.js                # Express app
│   ├── config/               # Variables de entorno
│   ├── db/                   # Pool PostgreSQL
│   ├── models/               # Queries y lógica de datos
│   ├── routes/               # auth, admin, api, webhooks
│   ├── services/             # OAuth, API Tiendanube, script
│   └── middleware/           # Auth y errores
├── public/
│   ├── admin/                # Panel de configuración
│   └── widget/               # Script del storefront
├── migrations/               # Schema SQL
└── scripts/migrate.js        # Runner de migraciones
```

## API del widget

`GET /api/widget/:storeId` — Devuelve configuración pública (colores, textos, niveles).

El widget usa el objeto `LS.cart.subtotal` de Tiendanube y consulta la config vía AJAX.

## Desarrollo del script

En Partner Portal, activá **Development mode** con URL:

```
http://localhost:3000/widget/rewards-bar.js
```

Agregá en el HTML de prueba (o vía query param del script):

```html
<script>window.DPP_APP_URL = 'http://localhost:3000';</script>
```

## Producción

- HTTPS obligatorio
- Actualizá todas las URLs en Partner Portal
- Configurá `APP_URL`, `TIENDANUBE_REDIRECT_URI` y `SESSION_SECRET`
