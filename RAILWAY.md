# Deploy en Railway

## 1. Subir el código a GitHub

```bash
cd /Users/palomaolaviaga/projects/desbloquear-premios
git init
git add .
git commit -m "Initial commit: app Tiendanube desbloquear premios"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/desbloquear-premios.git
git push -u origin main
```

## 2. Crear proyecto en Railway

1. Entrá a [railway.app/new](https://railway.app/new)
2. **Deploy from GitHub repo** → elegí `desbloquear-premios`
3. Railway detecta Node.js automáticamente

## 3. Agregar PostgreSQL

1. En el canvas del proyecto → **Create** → **Database** → **Add PostgreSQL**
2. Esperá a que el servicio esté activo

## 4. Variables de entorno (servicio web)

En el servicio Node.js → **Variables** → **Raw Editor**, pegá:

```env
NODE_ENV=production
APP_URL=https://TU-DOMINIO.up.railway.app
SESSION_SECRET=genera-un-secreto-largo-aleatorio-aqui

TIENDANUBE_APP_ID=33285
TIENDANUBE_CLIENT_SECRET=tu_client_secret_del_partner_portal
TIENDANUBE_REDIRECT_URI=https://TU-DOMINIO.up.railway.app/auth/callback
TIENDANUBE_API_VERSION=2025-03
TIENDANUBE_USER_AGENT=DesbloquearPremios (tu-email@dominio.com)
TIENDANUBE_SCRIPT_ID=id_del_script_en_partner_portal

DATABASE_URL=${{Postgres.DATABASE_URL}}
```

**Importante:** no pegues `postgresql://...@localhost:5432/...`. Borrá cualquier `DATABASE_URL` manual con `localhost`. La referencia `${{Postgres.DATABASE_URL}}` toma la URL interna del servicio PostgreSQL de Railway (host tipo `*.railway.internal`).

> Reemplazá `TU-DOMINIO` después de generar el dominio (paso 5). Si aún no lo tenés, deployá primero, generá dominio, y actualizá `APP_URL` y `TIENDANUBE_REDIRECT_URI`.

## 5. Dominio público

1. Servicio web → **Settings** → **Networking** → **Generate Domain**
2. Copiá la URL (ej. `desbloquear-premios-production.up.railway.app`)
3. Actualizá en Variables:
   - `APP_URL=https://desbloquear-premios-production.up.railway.app`
   - `TIENDANUBE_REDIRECT_URI=https://desbloquear-premios-production.up.railway.app/auth/callback`
4. Redeploy automático al guardar variables

## 6. Partner Portal Tiendanube (App 33285)

| Campo | Valor |
|-------|-------|
| Redirect URL | `https://TU-DOMINIO.up.railway.app/auth/callback` |
| App URL | `https://TU-DOMINIO.up.railway.app/admin` |
| Preferences URL | `https://TU-DOMINIO.up.railway.app/admin` |
| Script dev URL (opcional) | `https://TU-DOMINIO.up.railway.app/widget/rewards-bar.js` |

Webhooks GDPR:

- Store redact → `/webhooks/store/redact`
- Customer redact → `/webhooks/customers/redact`
- Customer data request → `/webhooks/customers/data_request`
- App uninstalled → `/webhooks/app/uninstalled`

## 7. Verificar deploy

- Health: `GET https://TU-DOMINIO.up.railway.app/auth/status`
- Panel: `https://TU-DOMINIO.up.railway.app/admin`
- Instalar app: `https://TU-DOMINIO.up.railway.app/auth/install`

Las migraciones corren automáticamente al iniciar (`npm start` → `scripts/start.js`).
