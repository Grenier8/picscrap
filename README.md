# Picscrap

Servicio backend para raspar catalogos de e-commerce de fotografia/electronica, normalizar productos y sincronizar precios en PostgreSQL.

## Resumen

`picscrap` ejecuta scrapers para paginas configuradas, guarda productos base y correlaciona productos de otras tiendas con distintas estrategias de filtrado.

Capacidades principales:

- Scraping multi-tienda con scrapers especificos por sitio.
- Flujo de paginas base y no base (`isBasePage` en BD).
- Modos de filtrado: `SKU`, `SIMILARITY`, `OPENAI`, `NONE`.
- Tipos de scrape en la logica: `FULL`, `LITE`, `PRICE` (la API actualmente mapea solo `FULL` y `LITE`).

## Stack tecnico

- Node.js + TypeScript
- Fastify (`@fastify/cors`)
- Prisma ORM + PostgreSQL
- Puppeteer (`puppeteer-extra` + stealth plugin)
- OpenAI Assistants API (opcional para correlacion)
- Utilidades de similitud (`fuse.js`, `natural`, librerias de imagen)

## Estructura del proyecto

```txt
src/
  index.ts                 # App Fastify y endpoints HTTP
  api/                     # Operaciones BD y trigger de scraping
  scraping/                # Clase base + scrapers por sitio + orquestacion
  service/openAi.ts        # Integracion OpenAI
  utils/                   # Prisma client, logger, archivos, similitud, helpers
prisma/schema.prisma       # Esquema de base de datos
Dockerfile                 # Imagen de contenedor para produccion
```

## Requisitos

- Node.js 20 recomendado (Docker usa `node:20-slim`)
- Base de datos PostgreSQL
- Chrome/Chromium disponible para Puppeteer
- Acceso a internet durante instalacion (postinstall descarga navegador)

## Variables de entorno

Crea un archivo `.env` o define variables en tu plataforma de ejecucion.

> Nota: el codigo actual no carga `.env` automaticamente con `dotenv/config`; asegurate de exportar variables en el runtime.

| Variable | Requerida | Descripcion |
|---|---|---|
| `DATABASE_URL` | Si | Cadena de conexion PostgreSQL para Prisma |
| `API_KEY` | Si (recomendado) | Requerida por `POST /api/scrape` via `x-api-key` |
| `PORT` | No | Puerto HTTP (por defecto `3010`) |
| `NODE_ENV` | No | `development` habilita exportes a archivos (`db/`, `correlations/`, `conversations/`) |
| `CHROME_PATH` | No | Ruta del ejecutable de Chrome para Puppeteer |
| `OPENAI_API_KEY` | Opcional | Necesaria si usas modo de filtrado `OPENAI` |
| `OPENAI_ASSISTANT_ID` | Opcional | ID de assistant para correlacion OpenAI |
| `VERCEL_GITHUB_COMMIT_SHA` | No | Version reportada por endpoint de salud |

Nota de seguridad:

- No ejecutes produccion sin una `API_KEY` fuerte.

## Instalacion

```bash
npm install
```

Este proyecto ejecuta tambien:

```bash
npx puppeteer browsers install chrome
```

como parte de `postinstall`.

## Configuracion de base de datos

1. Asegura conectividad PostgreSQL desde `DATABASE_URL`.
2. Genera cliente Prisma:

```bash
npx prisma generate
```

3. Aplica el esquema segun el flujo del equipo (por ejemplo `prisma db push` si no usan migraciones versionadas en este repo).

### Datos esperados

La tabla `Webpage` debe incluir entradas con nombres que coincidan con el mapeo de scrapers:

- `David and Joseph`
- `Picslab`
- `Rincón Fotográfico`
- `Apertura`
- `Horizontal Foto`
- `Ebest`

Ademas, al menos una pagina debe tener `isBasePage = true`.

## Ejecucion

### Desarrollo

```bash
npm run dev
```

### Build y arranque en produccion

```bash
npm run build
npm run start
```

### Scripts orientados a Render

```bash
npm run render-build
npm run render-start
```

## API

URL base: `http://localhost:3010` (o el host/puerto configurado)

### GET `/api/health`

Endpoint publico de salud.

Respuesta ejemplo:

```json
{
  "status": "healthy",
  "timestamp": "2026-03-26T12:00:00.000Z",
  "environment": "development",
  "version": "local"
}
```

### POST `/api/scrape`

Inicia proceso de scraping (protegido por API key en headers).

Headers:

- `x-api-key: <API_KEY>`
- `content-type: application/json`

Body:

```json
{
  "webpageIds": [1, 2, 3],
  "scrapType": "FULL",
  "filteringType": "SIMILARITY"
}
```

Valores permitidos:

- `scrapType`: `FULL` o `LITE` (cualquier otro valor cae en `LITE` en la capa API actual)
- `filteringType`: `SIMILARITY`, `OPENAI`, `NONE`, o por defecto `SKU`

Comportamiento importante:

- El endpoint responde rapido tras disparar el proceso; el scraping sigue en segundo plano.
- Si ya hay otro scraping en curso, responde `204` con `Scraping already in progress`.

## Docker

Build de imagen:

```bash
docker build --build-arg DATABASE_URL="postgresql://..." --build-arg CHROME_PATH="/usr/bin/google-chrome" -t picscrap .
```

Ejecucion del contenedor:

```bash
docker run -p 3010:3010 -e DATABASE_URL="postgresql://..." -e API_KEY="your-key" picscrap
```

## Notas operativas

- En `development` pueden generarse archivos auxiliares en `db/`, `correlations/` y `conversations/`.
- Los logs tambien se persisten en la tabla `Log` via helpers de Prisma.
- Actualmente no hay script de tests definido en `package.json`.

## Limitaciones conocidas

- Existe el tipo `PRICE` en la logica interna pero no se expone directamente en el mapeo HTTP.
- No se inicializa carga automatica de `.env` en el codigo (`dotenv/config` no importado).
- Algunas dependencias parecen no usarse desde scripts (`json-server`, `@vercel/node`) y conviene revisarlas.

## Licencia

`ISC` (segun `package.json`).
