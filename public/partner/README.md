# Widget — Subir a Partner Portal (App 33285)

## Archivo a subir

**`widget.js`** (en esta carpeta) — ~7 KB, minificado, standalone.

URL API embebida: `https://desbloquear-premios-production.up.railway.app`

---

## Formulario “Crear script” en partners.tiendanube.com

| Campo | Valor exacto | Notas |
|-------|----------------|-------|
| **Nombre del script** | `Desbloquear Premios - Barra de progreso` | Solo identificación interna para tu equipo |
| **Script handle** | `desbloquear-premios-barra` | Minúsculas, sin espacios. Aparece en la URL del CDN de Tiendanube |
| **Lugar de activación** | **Store** (Tienda / storefront) | La barra va en el carrito de la tienda, no en checkout |
| **Evento** | **onfirstinteraction** | Recomendado por Tiendanube. `onload` requiere aprobación por email |
| **Auto instalado** | **Sí** (recomendado con `public/widget.js`) | Tiendanube carga el script solo; en Railway: `TIENDANUBE_SCRIPT_AUTO_INSTALL=true` |
| **Modo desarrollo** | Opcional en pruebas | URL: `https://desbloquear-premios-production.up.railway.app/widget/rewards-bar.js` |
| **NubeSDK** | **No activar** | Este widget es JavaScript clásico (DOM + objeto `LS`). NubeSDK es otro modelo (Web Worker) |

### ¿Activar NubeSDK?

**No.** NubeSDK sirve para apps que corren en un Web Worker sin acceso al DOM. Este widget:

- Usa `document`, `LS.cart`, y `fetch`
- Se inyecta en el HTML del carrito

Si activás NubeSDK, este archivo **no funcionará**. Dejá el script como **JavaScript tradicional** en el Partner Portal.

---

## Subir nueva versión (v.5+) desde tu Mac

El agente en Cursor **no puede** usar el selector de archivos del portal. En la terminal del proyecto:

```bash
npm run build:widget
npx playwright install chromium
npm install -D playwright   # solo la primera vez
npm run upload:partner-widget
```

Logueate si el browser lo pide, ENTER en la terminal, y el script sube `public/partner/widget.js` + «Instalar en las tiendas».

---

## Sin Node/npm en la terminal

Si `node` o `npm` no se encuentran (terminal externa de macOS, sin Homebrew Node instalado), **subí el widget a mano**. Es la opción más rápida y no requiere instalar nada.

### Subida manual (recomendado)

1. Abrí el script en Partner Portal: [App 33285 — script #7124](https://partners.tiendanube.com/applications/details/33285/script/7124) e iniciá sesión si hace falta.
2. **Agregar versión** → en el selector de archivo elegí **`widget.js`** de esta carpeta:
   ```
   /Users/palomaolaviaga/projects/desbloquear-premios/public/partner/widget.js
   ```
   (En Finder: `projects` → `desbloquear-premios` → `public` → `partner` → `widget.js`.)
3. Guardá la versión y, si aparece, **Instalar en las tiendas** (o menú ⋮ → Instalar en las tiendas).

No hace falta `npm run build:widget` si `widget.js` ya está actualizado en el repo.

### Instalar Node (para automatizar después)

- **Homebrew:** `brew install node` (requiere Homebrew; en `.zprofile` suele ir `eval "$(/opt/homebrew/bin/brew shellenv zsh)"`).
- **Instalador oficial:** [https://nodejs.org](https://nodejs.org) (LTS).

Luego, en la carpeta del proyecto:

```bash
cd /Users/palomaolaviaga/projects/desbloquear-premios
npm install
npm install -D playwright
npx playwright install chromium
npm run upload:partner-widget
```

### Terminal integrada de Cursor vs zsh externo

- La **terminal integrada de Cursor** suele tener `node` en el PATH vía:
  `/Applications/Cursor.app/Contents/Resources/app/resources/helpers/node`
  Ese binario **no incluye `npm`**; sirve para scripts puntuales, no para `npm run …`.
- Una **terminal externa** (Terminal.app, iTerm) solo ve `node` si lo instalaste (brew, nodejs.org) o si cargás **nvm/fnm** en `~/.zshrc`.

Ejemplo **nvm** en `~/.zshrc` (después de instalar nvm):

```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
```

Abrí una terminal nueva y comprobá: `which node` y `which npm`.

### One-liner con Node de Cursor (solo si ya tenés `node_modules` + Playwright)

En esta Mac **no hay `npm` en el sistema**; el upload automático necesita Node completo + dependencias instaladas. Si ya corriste `npm install` y Playwright en el proyecto:

```bash
cd /Users/palomaolaviaga/projects/desbloquear-premios && /Applications/Cursor.app/Contents/Resources/app/resources/helpers/node scripts/upload-partner-widget.mjs
```

---

## Después de crear el script

1. **Add version** → subir `widget.js`
2. **Deploy test** en tienda demo (opcional)
3. **Deploy** a producción (estado `active`)
4. Copiar el **Script ID** (número) → Railway: `TIENDANUBE_SCRIPT_ID=...`
5. En el panel de la app → **Reinstalar widget** (asocia script a la tienda vía API)

---

## Regenerar el archivo

```bash
npm run build:widget
```

Editar lógica en `widget.standalone.js` → vuelve a generar `widget.js`.

---

## SyntaxError en la tienda (línea ~2300 del HTML)

Si la consola muestra `Uncaught SyntaxError: Unexpected string` en la URL de la página (no en un `.js` externo):

1. **Subí v6** de `public/partner/widget.js` (build limpio, sin minificador roto). La v5 híbrida minificada+legible podía romperse al inyectarse inline.
2. **Limpiá scripts viejos del tema** (Admin → Diseño → Editar código): buscar `65000`, `barra regalos`, `dpp-rewards`, `popup-overlay`.
3. **Códigos externos** (`store.assorted_js` / `external_scripts`): quitar barras manuales o widgets duplicados.
4. **GTM** (`GTM-KBQ9QMGC`): pausar etiquetas «barra regalos» y popup asesoría si siguen activas.
5. Verificá en incógnito tras deploy v6 + limpieza.
