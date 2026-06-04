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
