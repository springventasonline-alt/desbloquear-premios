# Widget para Partner Portal Tiendanube

## Archivo a subir

**`widget.js`** — script standalone minificado listo para el Partner Portal.

- URL API: `https://desbloquear-premios-production.up.railway.app/api/widget/{storeId}`
- Cierre IIFE (compatible con Tiendanube)
- Detecta `LS.store.id` y parámetro `?store=` del script

## Cómo subirlo

1. [partners.tiendanube.com](https://partners.tiendanube.com) → App **33285** → **Scripts**
2. Crear script (location: **store**, event: **onfirstinteraction**)
3. **Add version** → subir `widget.js`
4. **Deploy** a producción
5. Copiar el **Script ID** → variable `TIENDANUBE_SCRIPT_ID` en Railway

## Regenerar el build

```bash
npm run build:widget
```

Editá `dist/widget.standalone.js` si necesitás cambiar la lógica; el build genera `widget.js`.
