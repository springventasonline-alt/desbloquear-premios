# Diagramas de homologación — Tiendanube

Documentación de flujos para la app **Desbloquear premios** (ID **33285**).

## Archivos


| Archivo                                        | Uso                                                                               |
| ---------------------------------------------- | --------------------------------------------------------------------------------- |
| `homologacion-tiendanube-diagrama.html`        | Versión interactiva (Mermaid). Requiere internet para renderizar.                 |
| `homologacion-tiendanube-diagrama-export.html` | **Recomendado para PDF**: SVG embebido, funciona offline.                         |
| `homologacion-tiendanube-resumen.png`          | Imagen resumen de los 4 flujos (adjunto rápido).                                  |
| `diagramas/*.mmd`                              | Fuente Mermaid por flujo (regenerar con `@mermaid-js/mermaid-cli` si tenés Node). |


## Exportar PDF

1. Abrí `homologacion-tiendanube-diagrama-export.html` en Chrome o Safari.
2. **Archivo → Imprimir → Guardar como PDF**.
3. Orientación: **horizontal (apaisado)**, márgenes normales.

## Exportar PNG/SVG (opcional)

Desde la versión Mermaid (`homologacion-tiendanube-diagrama.html`):

- Botón **Exportar PDF (Imprimir)** en la página.
- Botón **Descargar SVG por diagrama** (un SVG por sección).

Con Node instalado:

```bash
cd docs/diagramas
npx @mermaid-js/mermaid-cli -i 01-oauth-instalacion.mmd -o 01-oauth-instalacion.png -b white
```

## Flujos documentados

1. **OAuth** — `/auth/install` → Tiendanube authorize → `/auth/callback` → token → `upsertStore` → `activateStoreScript`
2. **Script** — Partner script 7124, auto-install, `onfirstinteraction`, `LS` + DOM carrito
3. **API widget** — `GET /api/widget/:storeId` → `reward_config` / niveles
4. **Desinstalación** — webhooks `/webhooks/app/uninstalled` y `/webhooks/store/redact`

