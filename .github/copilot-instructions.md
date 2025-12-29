# AI Agent Instructions for QR Generator Monorepo

Guía actualizada para el agente AI. Última actualización: 2025-12-29.

---

## 1. Arquitectura General

### Stack
- **Monorepo** con npm workspaces: `backend/` (API Express + TypeScript) y `frontend/` (React + Vite + TypeScript)
- **Raíz** orquesta scripts, lint, y configuración de deployment

### Flujo Principal
1. Frontend envía `POST /api/qr` con configuración
2. Backend genera QR (PNG o SVG) usando `qrcode` + opcional logo con `sharp`
3. Responde base64 + meta (hash SHA256 truncado 16 hex, size, format)
4. Frontend muestra preview y guarda historial en localStorage (máx 20, dedupe por hash)

### Reglas de Negocio
- Si hay `logo`, backend fuerza `errorCorrection: 'H'` (ignora valor del request)
- Hash se calcula únicamente en backend para consistencia
- Historial guarda solo meta + config (no la data del QR para evitar inflar localStorage)

---

## 2. Backend (`backend/`)

### Estructura
```
backend/
├── src/
│   ├── app.ts           # Express app, middlewares, rutas
│   ├── server.ts        # HTTP server, puerto
│   ├── types.d.ts       # Ambient declarations (qrcode module)
│   ├── config/          # (futuro) configuración centralizada
│   ├── controllers/
│   │   └── qr.controller.ts
│   ├── middleware/
│   │   ├── errorHandler.ts
│   │   ├── logger.ts    # Pino structured logging
│   │   ├── rateLimit.ts
│   │   └── requestId.ts # UUID por request
│   ├── routes/
│   │   └── qr.routes.ts
│   ├── services/
│   │   └── qr.service.ts  # Core: genera QR, compone logo, calcula hash
│   └── utils/
│       └── validation.ts  # Zod schemas
└── tests/
    ├── qr.test.ts
    └── validation.test.ts
```

### Dependencias Clave
- `qrcode` + `@types/qrcode` - Generación QR (types en dependencies, no devDeps)
- `sharp` - Composición de logo en PNG
- `zod` - Validación de schemas
- `pino` - Structured logging (JSON en prod, pretty en dev)
- `rate-limiter-flexible` - Rate limiting
- `helmet` - Security headers + CSP
- `compression` - Gzip responses

### Endpoints
| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/qr` | POST | Genera QR code |
| `/health` | GET | Health check (uptime, timestamp, commit) |
| `/version` | GET | Version info |

### Logging
- Request ID (UUID) en cada request via `x-request-id` header
- Pino logger con contexto estructurado
- Logs incluyen: `reqId`, `method`, `url`, `statusCode`, `duration`

---

## 3. Frontend (`frontend/`)

### Estructura
```
frontend/
├── src/
│   ├── main.tsx
│   ├── components/
│   │   ├── ColorPicker.tsx
│   │   ├── DownloadButtons.tsx
│   │   ├── HistoryPanel.tsx
│   │   ├── LogoUploader.tsx
│   │   ├── QRPreview.tsx
│   │   ├── ThemeToggle.tsx
│   │   └── Toast.tsx
│   ├── hooks/
│   │   ├── useDebounce.ts
│   │   ├── useLocalStorage.ts
│   │   └── useTheme.ts
│   ├── lib/
│   │   └── api.ts
│   ├── pages/
│   │   ├── App.tsx      # Página principal
│   │   ├── index.ts
│   │   └── RootApp.tsx
│   ├── store/
│   │   └── qrStore.ts   # Zustand store
│   └── styles/
│       └── tailwind.css
├── public/
│   ├── manifest.webmanifest
│   └── sw.js            # Service Worker (PWA básico)
└── tests/
    ├── app.test.tsx
    └── setup.ts
```

### State Management
- **Zustand** store (`qrStore.ts`) con: `config`, `result`, `history`
- Generación reactiva con debounce (300ms) cuando `config.data` no está vacío
- Historial máx 20 entradas, orden inverso, dedupe por hash

### Features
- Download PNG/SVG con filename `qr-<hash>.<ext>`
- Export/Import config (JSON)
- Share via Web Share API (fallback: clipboard)
- Copy HTML `<img>` tag
- Theme toggle (light/dark/system)
- PWA básico con manifest + service worker

---

## 4. Testing

### Configuración
- **Jest** + **ts-jest** para ambos workspaces
- **Supertest** para tests de API en backend
- **React Testing Library** para frontend

### Ejecutar Tests
```bash
npm run test           # Todos (backend + frontend)
npm run test:backend   # Solo backend
npm run test:frontend  # Solo frontend
```

### Cobertura Actual
- **Backend**: 31 tests (API, validación, edge cases)
- **Frontend**: 9 tests (renderizado, interacciones)
- **Total**: 40 tests passing ✅

---

## 5. DevOps & Deployment

### Scripts Principales (raíz)
```bash
npm run dev            # Concurrently backend + frontend
npm run build          # Build ambos workspaces
npm run start          # Producción: node backend/dist/server.js
npm run lint           # ESLint
npm run test           # Jest
```

### Docker
- **Multi-stage Dockerfile** optimizado para producción
- Stage 1: Build (instala deps, compila TS, build Vite)
- Stage 2: Runtime (solo archivos necesarios, ~150MB)
- Frontend se copia a `backend/dist/public` y se sirve estáticamente

```bash
# Build local
docker build -t qr-generator .

# Run local
docker run -p 4000:4000 -e SERVE_STATIC=1 qr-generator
```

### GitHub Actions CI/CD
Archivo: `.github/workflows/ci.yml`

**Jobs:**
1. **lint** - ESLint check
2. **build** - TypeScript compilation
3. **test** - Jest tests
4. **docker** - Build y push a GHCR (solo en `main`)

**Triggers:** Push/PR a `main`

### Railway Deployment

**Configuración actual** (single-container):
- Usa **Nixpacks** con `nixpacks.toml`
- Un solo servicio sirve backend + frontend estático
- Variables requeridas: `SERVE_STATIC=1`, `NODE_ENV=production`

**Archivos de config:**
- `nixpacks.toml` - Build phases y start command
- `railway.json` - Healthcheck path

**⚠️ IMPORTANTE - Settings en Railway UI:**
- Custom Build Command: **VACÍO** (usa nixpacks.toml)
- Custom Start Command: **VACÍO** (usa nixpacks.toml)
- Healthcheck Path: `/health`
- Solo UN servicio (backend sirve frontend estático)

---

## 6. Convenciones de Código

### TypeScript
- Strict mode habilitado
- No `any` en código core (usar tipos específicos o `unknown`)
- Usar `@ts-expect-error` en lugar de `@ts-ignore` cuando sea necesario
- CommonJS output en backend (`"module": "CommonJS"` en tsconfig)

### ESLint Rules Importantes
- `@typescript-eslint/no-var-requires` - Usar `import` en lugar de `require()`
- `@typescript-eslint/no-explicit-any` - Evitar `any`
- `@typescript-eslint/no-unused-vars` - No dejar variables sin usar

### Imports
- Usar ES modules (`import`/`export`) siempre
- Orden: externos → internos → tipos
- **NUNCA usar `require()` en archivos TS**

### Accessibility
- Labels con `htmlFor` asociado
- `aria-live="polite"` para preview y toasts
- Semantic HTML

---

## 7. Variables de Entorno

### Backend
| Variable | Default | Descripción |
|----------|---------|-------------|
| `PORT` | 4000 | Puerto del servidor |
| `NODE_ENV` | development | Entorno |
| `ORIGIN` | * | CORS origin |
| `SERVE_STATIC` | - | Si existe, sirve frontend estático |
| `DISABLE_CSP` | - | Deshabilita Content Security Policy |
| `COMMIT_HASH` | unknown | Git commit (inyectado en Docker build) |

### Frontend (build time)
| Variable | Descripción |
|----------|-------------|
| `VITE_API_URL` | URL del API (default: mismo origen) |

---

## 8. Troubleshooting

### Errores Comunes

| Error | Causa | Solución |
|-------|-------|----------|
| `ECONNREFUSED /api/qr` | Backend no corriendo | Verificar que puerto 4000 esté activo |
| `Cannot find module 'qrcode'` | @types/qrcode faltante | Debe estar en dependencies (no devDeps) |
| `Require statement not part of import` | Usado `require()` | Cambiar a `import` ES module |
| Railway corre `npm run dev` | Custom commands no vaciados | Limpiar Custom Build/Start en Railway UI |
| `MODULE_NOT_FOUND server.js` | Build no ejecutado | Verificar nixpacks.toml tiene build step |

### Debug Local
```bash
# Test API manualmente
curl -X POST http://localhost:4000/api/qr \
  -H "Content-Type: application/json" \
  -d '{"data":"hello"}'

# Health check
curl http://localhost:4000/health
```

---

## 9. Roadmap Completado ✅

1. ✅ `.env.example` con documentación de variables
2. ✅ Test warnings limpiados (40 tests sin warnings)
3. ✅ Structured logging con Pino (request ID, JSON en prod)
4. ✅ Tests expandidos (31 backend + 9 frontend)
5. ✅ Docker pipeline + GitHub Actions CI/CD + GHCR publishing
6. ✅ Railway deployment configuration

---

## 10. Próximos Pasos Sugeridos

1. **Caducidad de QR**: Campo opcional `expiresAt` en request
2. **Formato PDF**: Rama adicional en `generateQRCode`
3. **Botón Generate Manual**: Desactivar auto-generación, agregar botón explícito
4. **Shared Types**: Mover schemas Zod a `shared/` para reutilizar en frontend
5. **E2E Tests**: Playwright o Cypress para tests de integración completos
6. **Monitoring**: Agregar Sentry o similar para error tracking

---

## 11. Anti-Patrones a Evitar

- ❌ Duplicar lógica de hash en frontend
- ❌ Guardar data completa del QR en historial (solo meta + config)
- ❌ Cambiar ECC en frontend cuando hay logo (será sobrescrito)
- ❌ Usar `require()` en archivos TypeScript
- ❌ Usar `any` sin justificación
- ❌ Poner @types/* en devDependencies si se necesitan en runtime/build de prod
- ❌ Dejar Custom Commands en Railway cuando se usa nixpacks.toml

---

## 12. Referencias Rápidas

| Archivo | Propósito |
|---------|-----------|
| `backend/src/services/qr.service.ts` | Core QR generation |
| `backend/src/utils/validation.ts` | Zod schemas |
| `backend/src/types.d.ts` | TypeScript declarations |
| `frontend/src/store/qrStore.ts` | Zustand store |
| `frontend/src/pages/App.tsx` | Main page + auto-generation effect |
| `nixpacks.toml` | Railway/Nixpacks build config |
| `.github/workflows/ci.yml` | GitHub Actions CI/CD |
