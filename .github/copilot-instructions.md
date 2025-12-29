# AI Agent Instructions for QR Generator Monorepo

Concise, project-specific guidance so an AI coding agent can be productive immediately.

## 1. Arquitectura General
- Monorepo npm workspaces: `backend/` (API Express) y `frontend/` (React + Vite). Raíz solo orquesta scripts y lint.
- Flujo principal: Frontend envía `POST /api/qr` con la config → Backend genera QR (PNG o SVG) usando `qrcode` y opcionalmente compone logo con `sharp` (PNG) o <image> en SVG → responde base64 + meta (hash, size, format) → Frontend muestra preview y guarda historial (localStorage, máx 20, dedupe por hash).
- Hash SHA256 truncado (16 hex) = ID lógico usado para: nombre de archivo descarga, historial y evitar entradas duplicadas consecutivas.
- Forzado de ECC: si llega `logo` el backend ignora `errorCorrection` y fija `H`; UI muestra nota aclaratoria.

## 2. Backend
- Entrada principal: `backend/src/app.ts` (configura middlewares) + `server.ts` (levanta HTTP).
- Capas:
  - `routes/qr.routes.ts` → monta `/api/qr`.
  - `controllers/qr.controller.ts` → valida usando Zod (`utils/validation.ts`) y delega a servicio.
  - `services/qr.service.ts` → genera QR, compone logo, calcula hash.
  - `middleware/` → `requestId`, `logger` (pino), `rateLimit`, `errorHandler` (captura y formatea).
- Validación estricta: rechaza tamaños fuera de rango, escala, data vacía. JSON limit en `express.json` = 1MB.
- Dependencias clave: `qrcode`, `sharp`, `zod`, `rate-limiter-flexible`, `pino`.
- Testing (si se amplía): usar Supertest sobre `app` directamente.

## 3. Frontend
- Entrada: `frontend/src/main.tsx` + `pages/App.tsx` (única página).
- Estado global: `store/qrStore.ts` (Zustand) mantiene `config`, `result`, `history`. Al agregar historia se clona config y deduplica por hash.
- Generación reactiva: efecto con debounce (hook `useDebounce`) dispara axios.post sólo cuando `config.data` no está vacío (300ms quiet period).
- Componentes relevantes:
  - `QRPreview` muestra imagen base64 y hash.
  - `DownloadButtons` crea un `<a>` en tiempo real para descarga (filename `qr-<hash>.<ext>`).
  - `HistoryPanel` lista hashes con botón Load (restaura config).
  - `LogoUploader` lee archivo a base64 (valida tamaño <200KB).
  - `ThemeToggle` (light/dark/system) usando `useTheme` que persiste en localStorage.
- Acciones extra: Export/Import config (json), Share (Web Share API o fallback clipboard), Copy HTML `<img>` (dentro de DownloadButtons).
- PWA: manifest y `public/sw.js` simple (cache básico).

## 4. Convenciones y Patrones
- Tipo estricto TS (sin `any` en código core). CommonJS en backend build output; runtime usa ts-node durante dev.
- Historial máximo 20 entradas, orden inverso (más reciente primero); evitar duplicados consecutivos.
- Todos los labels asociando `htmlFor`; `aria-live="polite"` para preview & toasts.
- Hash se genera únicamente en backend para consistencia (no calcular en frontend).
- Logo siempre centra usando `sharp` (PNG) o `<image>` patch insert antes de `</svg>`.

## 5. Scripts y Workflows
Root scripts (ver `package.json`):
- `npm run dev` → `concurrently` backend + frontend (si un proceso muere, revisar salida). En Windows si aparece "¿Desea terminar el trabajo por lotes?" es por Ctrl+C.
- `npm run build` → compila backend (tsc) + frontend (vite build, tras `tsc`).
- `npm run test` → ejecuta backend y frontend tests (Jest + RTL + ts-jest). Frontend mocking axios para determinismo.
- Lint: `npm run lint` (ESLint + @typescript-eslint). Resolver import disabled (custom resolver removido).

## 6. Errores y Debug
- Si frontend lanza `ECONNREFUSED /api/qr` → backend no está corriendo en :4000.
- Si `ts-node` no se reconoce: instalar dev deps en backend (`ts-node`, `typescript`, `@types/node`).
- Rate limiting (429) posible si se dispara generación en loops (ver middleware config para tuning futuro).
- Para pruebas manuales de API: `curl -X POST http://localhost:4000/api/qr -H "Content-Type: application/json" -d '{"data":"hello"}'`.

## 7. Testing Notas
- Frontend tests en `frontend/tests/app.test.tsx` usan mock incremental de hashes. Al modificar store/history mantener la deduplicación para que las pruebas sigan pasando.
- No introducir ESM sólo en backend sin ajustar Jest (mantener estrategia actual o migrar todo a ESM + jest.config adaptado).

## 8. Extender Funcionalidad
- Para añadir caducidad de QR: agregar campo opcional `expiresAt` en request schema y NO romper requests existentes; luego capa de verificación antes de generar.
- Para soportar multi formatos extra (PDF): agregar rama en `generateQRCode` y ajustar validación.
- Añadir botón “Generate” manual: envolver POST en handler y desactivar efecto automático (o hacerlo configurable con flag en store).

## 9. Estabilidad / Mantenibilidad
- Mantener sincronizados tipos entre frontend y backend si se mueve el esquema a `shared/` (actualmente vacío).
- Al refactorizar servicio QR, mantener cálculo de hash después de compositing (orden crítico para que el historial identifique la versión final).
- No bloquear UI con procesos largos de `sharp`; si se añade procesamiento pesado, considerar cola o worker thread.

## 10. Anti‑Patrones a Evitar
- Duplicar lógica de hash en frontend.
- Guardar data del QR directamente en historial (sólo meta + config). Eso evita inflar localStorage.
- Cambiar ECC en frontend cuando hay logo (será sobrescrito y podría confundir tests/usuarios sin nota UI).

## 11. Referencias Rápidas
- Backend servicio principal: `backend/src/services/qr.service.ts`.
- Validación Zod: `backend/src/utils/validation.ts`.
- Store global: `frontend/src/store/qrStore.ts`.
- Generación automática efecto: `App.tsx` (useEffect con `debouncedConfig`).

## 12. TODO Marcados
- Algunos comentarios `TODO` para toasts de error backend → implementar catch con `setToast` y mensaje accesible.
- PWA SW mínimo (optimizable para cache selectivo por hash).

Si algo no está claro (p.ej. deseas mover esquema a `shared/`) avisa y se amplía esta guía.
