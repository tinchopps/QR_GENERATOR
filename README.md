# QR Generator – Interactive Full-Stack QR Code Application

Aplicación full‑stack lista para portfolio / producción ligera que demuestra arquitectura limpia, tipado estricto, tests y buenas prácticas DevX.

## Descripción
Aplicación full‑stack profesional para generar códigos QR personalizables (PNG / SVG) con colores, tamaño, nivel de corrección de errores y logo central opcional. Incluye vista previa reactiva, historial local, descarga, copia al portapapeles y arquitectura modular preparada para despliegue en Vercel.

## Stack y Decisiones Técnicas (Resumen)
- Backend: Node.js + Express + TypeScript (robustez, tipado estricto, mantenibilidad). Generación de QR con `qrcode` + composición de logos con `sharp` (PNG) y embebido `<image>` en SVG.
- Frontend: React + Vite (arranque rápido, HMR eficiente) + TypeScript + Zustand (estado global mínimo y explícito, evita boilerplate de Context cuando crece el estado).
- Estilos: TailwindCSS (rapidez de prototipado + consistencia + dark mode via clase).
- Validación: Zod (schema + inferencia de tipos, unifica runtime y compile time).
- Logs: pino (rendimiento y JSON estructurado) + middleware personalizado.
- Rate limiting: `rate-limiter-flexible` (memoria simple) para demo de seguridad.
- Test: Jest + ts-jest, Supertest (backend), React Testing Library (frontend).
- Monorepo npm workspaces para orquestar scripts y dependencias compartidas.

## Arquitectura de Carpetas
```
root/
	backend/
		src/{controllers,services,routes,middleware,utils,config}
	frontend/
		src/{components,hooks,store,pages,styles}
	shared/ (tipos compartidos request/response)
```

## Cómo Ejecutar (Resumen Rápido)
1. `npm install`
2. `npm run dev` (levanta backend :4000 y frontend :5173 con proxy `/api`).
3. Producción: `npm run build` y luego `npm --workspace backend start` (frontend build generado en `frontend/dist`).

## Variables de Entorno
Ahora existe un archivo `.env.example` en la raíz. Pasos:
1. Copia `.env.example` a `.env` (raíz) y ajusta valores.
2. (Opcional) Si algún hosting carga sólo variables por carpeta, puedes duplicar las relevantes en `backend/.env`.
3. Para frontend separado (otro dominio): define `VITE_API_BASE=https://tu-backend`.
4. Para un único contenedor Docker con frontend servido por backend, deja `VITE_API_BASE` vacío y exporta `SERVE_STATIC=1`.


## API Contract
Endpoint: `POST /api/qr`

Request JSON (validation con Zod):
```
{
	data: string (1..2048)
	format: 'png' | 'svg'
	size: number (128..1024)
	colorDark: string (#RRGGBB / palabra CSS)
	colorLight: string (#RRGGBB / palabra CSS)
	errorCorrection: 'L' | 'M' | 'Q' | 'H'
	logo?: base64 DataURL ó solo base64
	logoScale: number (0.05..0.4)
}
```
Notas:
- Si `logo` está presente el backend fuerza ECC = `H` (máxima redundancia) ignorando el valor enviado. Se devuelve igualmente el hash representativo del resultado final.
- Sanitización básica: tamaño y escala acotados, payload JSON limitado (1MB), colores controlados por regex simple de librería `qrcode`.

Response 200:
```
{
	mimeType: 'image/png' | 'image/svg+xml',
	data: string (base64 sin encabezado),
	meta: {
			size: number,
			format: 'png' | 'svg',
			hash: string (sha256 truncado 16 hex),
			ecc: 'L' | 'M' | 'Q' | 'H'
		}
}
```
Errores: 400 (validation), 429 (rate limit), 500 (server). Formato `{ error: string, requestId?: string }`.

## Flujo de Generación
1. Frontend ajusta configuración (debounce 300ms).  
2. Petición POST -> backend genera QR.  
3. Si hay logo: PNG: compositing `sharp`; SVG: `<image>` centrado.  
4. Calcula hash (sha256 truncated) para identificación y cache lógico.  
5. Frontend actualiza preview y persiste en historial (localStorage, máx 20).

## Decisiones Clave
- Debounce 300ms evita tormenta de requests al escribir.  
 - Toggle de autogeneración (persistido) y atajo Ctrl+Enter para generar manualmente con auto off.  
- Zustand en vez de Context+Reducer: estado pequeño pero con múltiples productores; API mínima y testable.  
- Hash sirve para nombres de archivo y deduplicación visual en historial (se evita duplicar consecutivos).  
- Forzar ECC H con logo se documenta en UI y README para transparencia de integridad lectora.  
- CommonJS en backend para simplificar Jest (evita fricción ESM + ts-jest).  
- Tests de UI desacoplados de red via mock de `axios` → determinismo.

## Deploy (Producción)
### Opción 1: Vercel (Monorepo)
1. Importar repo.
2. Proyecto raíz. Build frontend: `npm --workspace frontend run build`. Output: `frontend/dist`.
3. Backend: convertir a serverless exportando handler (ej. `export default app;`). En `vercel.json` mapear `api/index.ts` → `backend/src/serverless.ts` (crear wrapper que importe `app`).
4. Ajustar CORS a dominio final.

### Opción 2: Docker
Docker multi‑stage incluido con build automatizado via GitHub Actions:

#### Build Local:
```bash
# Build con commit hash personalizado
docker build --build-arg COMMIT_HASH="$(git rev-parse --short HEAD)" -t qr-generator .

# Build con docker-compose (incluye healthcheck)
docker-compose up qr-generator

# Build para desarrollo con hot reload
docker-compose --profile dev up qr-generator-dev
```

#### Deploy con Imagen Pre-construida:
```bash
# Usar imagen desde GitHub Container Registry
docker run -p 4000:4000 ghcr.io/tu-usuario/qr-generator:main

# Con variables de entorno personalizadas
docker run -p 4000:4000 \
  -e ORIGIN=https://tu-dominio.com \
  -e NODE_ENV=production \
  ghcr.io/tu-usuario/qr-generator:main
```

#### Pipeline Automatizado:
- Push a `main` branch → build y publish automático a `ghcr.io`
- Tags version (`v1.0.0`) → build multi-platform (amd64, arm64)
- Commit hash se inyecta automáticamente para trazabilidad
- Endpoints disponibles: `/health` y `/version` para monitoreo

Sirve API en `:4000` y frontend estático (variable `SERVE_STATIC=1`).

### Opción 3: Railway / Render (Backend) + Static Host (Netlify/GitHub Pages)
1. Desplegar backend → obtener URL base.
2. Configurar proxy o variable `VITE_API_BASE` para frontend (modificar axios baseURL).

## Variables de Entorno
`PORT` (backend, default 4000)  
`ORIGIN` (CORS whitelist simple, default `*`)  
Se pueden añadir: `RATE_POINTS`, `RATE_DURATION` para tunear limitador.

## Seguridad y Robustez
- Rate limiting en memoria (cambia a Redis para horizontal).  
- Helmet + CSP (permitiendo data:/blob:) + compression + CORS controlado.  
- Validación estricta (Zod) → early reject.  
- Logo size limit (200KB) en frontend + JSON limit backend 1MB.  
- CSP desactivable para debug estableciendo `DISABLE_CSP=1`.

## Accesibilidad (A11y)
- Labels explícitos `htmlFor` en todos los controles.  
- `aria-live="polite"` para preview y toasts.  
- Contraste gestionado por Tailwind + dark mode.  
- Teclas tab orden natural (estructura semántica simple).  
- Botones con `aria-label` para acciones sólo icónicas.  
- Evita flashing: no animaciones intensas.

Checklist WCAG mínima: Perceptible (texto alternativo, color no único), Operable (foco visible nativo), Comprensible (labels claros), Robusto (HTML semántico simple).

## Testing Strategy
- Backend: Jest + Supertest (validación y caso feliz).  
- Frontend: Jest + React Testing Library: render básico, cambio de color, descarga (mock anchor), share fallback (clipboard), restauración de historial.  
- Determinismo: mock axios → hashes controlados incrementales.  
- Act warnings mitigados envolviendo interacciones críticas.

Extensiones futuras: pruebas de accesibilidad (jest-axe), snapshot SVG.

## Performance
- Debounce evita renders + requests excesivos.  
- Hash permite cache de descargas (navegador reusa si mismo contenido).  
- PNG compositing sólo si hay logo.  
- Bundle frontend optimizable con code splitting (futuro).  
- Posible memo del preview si meta.hash no cambia.

## Limitaciones / Trade-offs
- Rate limiting in-memory (no multi instancia).  
- Sin autenticación; API abierta (sólo demo).  
- Sin sanitización avanzada de colores (confía en librería).  
- No se hace parse profundo de DataURL logo (supone válido).  
- Historial sólo local (no sincronizado multi dispositivo).

## Futuras Mejoras
- i18n (react-intl / lingui).  
- Modo batch / bulk generation.  
- Guardado en nube + cuentas usuario.  
- Selección automática de contraste color.  
- Editor de margen / quiet zone, nivel de compresión.  
- Worker para generación off-main-thread en frontend (para SVG local en modo offline).  
- Cache / CDN para respuestas idénticas por hash.

## Checklist de Requerimientos
- [x] Monorepo workspaces (root + backend + frontend).  
- [x] Backend Express TS con middlewares (requestId, logger, rateLimit, errorHandler).  
- [x] Generación QR PNG/SVG + logo overlay + fuerza ECC H con logo.  
- [x] Hash SHA256 truncado 16.  
- [x] Validación Zod.  
- [x] Frontend React Vite TS + Tailwind + Zustand + Tema.  
- [x] Vista previa reactiva (debounce).  
- [x] Descarga PNG/SVG y copia HTML `<img>`.  
- [x] Historial persistente (localStorage, dedupe).  
- [x] Export / Import configuración.  
- [x] Share con Web Share / fallback clipboard.  
- [x] PWA (manifest + SW básico).  
- [x] Accesibilidad básica (labels, aria-live).  
- [x] Tests backend + frontend clave.  
- [x] Indicador UI forzado ECC con logo.  
- [x] Documentación ampliada (este README).  
- [x] Campo meta.ecc y tipos compartidos en `shared/`.  
- [x] CI GitHub Actions (`.github/workflows/ci.yml`).  
- [x] CSP estricta (data:/blob:) configurable.  
- [x] Dependabot (`.github/dependabot.yml`).  
- [x] LICENSE (MIT).  

## Guía Rápida de Scripts
Root:  
`npm run dev` → paralelo frontend + backend.  
`npm test` / `npm run test:backend` / `npm run test:frontend`  
`npm run lint`  
`npm run build` (ambos).

Backend workspace: `npm start` (post build).  
Frontend workspace: `npm run build` genera `dist/`.

## Estructura de Código (Detallada)
Backend capas:  
`routes` → rutas Express.  
`controllers` → parse + delega a servicio.  
`services` → lógica de generación/IO.  
`middleware` → cross-cutting (id, log, rate, error).  
`utils` → validación Zod.  

Frontend:  
`store` Zustand (config/result/history).  
`components` UI modular.  
`hooks` utilidades (theme, debounce, storage).  
`pages/App` orquesta.  

## Recuperación de Errores
- Backend central error handler produce JSON con `requestId` para trazabilidad.  
- Logo inválido: se ignora silenciosamente (no rompe experiencia) → loggable mejora futura.

## Acciones de Mantenimiento Sugeridas
- Añadir CI (GitHub Actions) → lint + test + build.  
- Añadir análisis de dependencia (Dependabot).  
- Integrar Sentry para error tracking.

## Asunciones
- Uso principal: generación individual interactiva.  
- Carga de logo limitada a 200KB es suficiente para la mayoría de logotipos simples.  
- No se requiere autenticación inicial.  
- Forzar ECC H con logo es aceptable aunque incremente densidad.  
- Historial máximo 20 entradas es adecuado (UX / memoria).

## Licencia
MIT

## Mejoras Futuras (Ideas)
- PWA (offline cache de últimos QR + manifest).
- Exportar / importar configuración JSON.
- Compartir via Web Share API.
- Internacionalización (i18n) y temas adicionales.
- Modo avanzado: batch generation / API key auth.

## Licencia
MIT

## Capturas / GIF (Opcional)
Agregar en `docs/` y referenciar aquí para portfolio.

---
Fin del README.
