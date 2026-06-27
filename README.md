# Carvuk — Monorepo full stack

Monorepo de tres piezas que se comunican: base de datos Postgres (Supabase, con
Docker local como alternativa), API en Django + django-ninja y SPA en Vite +
React 19. La autenticación es con **Clerk** (JWT verificado de forma stateless
en el backend) y la UI usa **shadcn/ui** sobre Tailwind v4.

```
.
├── backend/           # Django + django-ninja, API montada en /api
├── frontend/          # Vite + React 19 + TypeScript + Tailwind v4 + shadcn/ui
├── docker-compose.yml # Postgres 16 local (alternativa a Supabase)
└── .env.example       # Credenciales de Postgres para docker-compose
```

## Stack

| Capa     | Tecnología                                                  |
| -------- | ----------------------------------------------------------- |
| Backend  | Python · Django · django-ninja · psycopg v3                 |
| Auth     | Clerk (JWT/JWKS, stateless)                                 |
| Frontend | Vite · React 19 · TypeScript · Tailwind v4 · shadcn/ui      |
| DB       | Postgres — Supabase (o Postgres 16 local vía docker-compose)|

## Requisitos

- Python 3.11+
- Node 18+
- Docker + Docker Compose (solo si usás Postgres local en vez de Supabase)
- Una cuenta de [Clerk](https://dashboard.clerk.com) y, opcionalmente, de
  [Supabase](https://supabase.com)

---

## Levantar todo desde cero

Ejecutá cada bloque en orden. Los pasos 3 y 4 usan terminales separadas
(Django y Vite quedan corriendo en foreground).

### 0. Variables de entorno

```bash
cp .env.example .env                 # raíz (Postgres para docker-compose)
cp backend/.env.example backend/.env # backend (DB + Clerk)
cp frontend/.env.example frontend/.env
```

Completá los valores reales (ver **Configuración** abajo): la DB en
`backend/.env` y las claves de Clerk en `backend/.env` y `frontend/.env`.

### 1. Base de datos

**Opción A — Supabase (gestionada):** en `backend/.env`, usá el bloque
`SUPABASE` (datos del dashboard → Connect → Session Pooler). No requiere Docker.

**Opción B — Postgres local (Docker):**

```bash
docker compose up -d
docker compose ps          # el healthcheck debe estar "healthy"
```

### 2. Migraciones + 3. Backend (Django) — terminal A

```bash
cd backend
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

Verificación rápida:

```bash
curl http://localhost:8000/api/health
# -> {"status": "ok"}
```

Docs interactivas de la API (django-ninja): http://localhost:8000/api/docs

### 4. Frontend (Vite) — terminal B

```bash
cd frontend
npm install
npm run dev
```

Abrí http://localhost:5173. Si no hay sesión, se muestra la pantalla de
**login**; al iniciar sesión con Clerk, una pantalla con tu nombre y un botón de
**cerrar sesión**.

---

## Configuración

### Clerk (autenticación stateless)

El frontend hace login con Clerk y recibe un JWT; el backend lo verifica con las
claves públicas de Clerk (JWKS), sin guardar usuarios en su DB.

1. Creá una app en [dashboard.clerk.com](https://dashboard.clerk.com) y copiá:
   - **Publishable key** (`pk_test_...`) → `frontend/.env` → `VITE_CLERK_PUBLISHABLE_KEY`
   - **Frontend API URL** (issuer) → `backend/.env` → `CLERK_ISSUER`
2. (Opcional) Para recibir el email en `/api/me`: en el dashboard, **Sessions →
   Customize session token**, agregá `{ "email": "{{user.primary_email_address}}" }`.
   Por defecto el token de sesión solo trae `sub` y `sid`.

### Base de datos

- **Supabase**: en `backend/.env`, completá el bloque `SUPABASE` con los datos
  del **Session Pooler** y `POSTGRES_SSLMODE=require`.
- **Local (Docker)**: usá el bloque `LOCAL`; las credenciales deben coincidir
  con las del `.env` de la raíz que consume docker-compose.

El conmutador es solo cuestión de qué bloque está activo en `backend/.env`; el
código (`config/settings.py`) es el mismo para ambos.

## Cómo está cableado

- **Auth**: `ClerkProvider` envuelve la app (`frontend/src/main.tsx`). El backend
  valida el `Authorization: Bearer <jwt>` en `backend/core/auth.py` (`ClerkAuth`).
- **CORS**: `django-cors-headers` permite el origen `http://localhost:5173`
  (configurable en `backend/.env` → `CORS_ALLOWED_ORIGINS`).
- **DB**: Django se conecta vía `django-environ` con las variables `POSTGRES_*`
  de `backend/.env`. TLS configurable con `POSTGRES_SSLMODE`.
- **API**: django-ninja se monta en `/api` (`config/urls.py`). Los endpoints
  viven en `backend/core/api.py`. Nuevos dominios → `api.add_router(...)`.
- **Frontend → backend**: la URL sale de `VITE_API_URL` (`frontend/.env`),
  default `http://localhost:8000/api`.
- **UI**: shadcn/ui (`frontend/src/components/ui/`), helper `cn` en
  `src/lib/utils.ts`, tema (tokens Tailwind v4) en `src/index.css`. Nuevos
  componentes: `npx shadcn@latest add <componente>`.

## Endpoints

| Método | Ruta          | Auth         | Respuesta                          |
| ------ | ------------- | ------------ | ---------------------------------- |
| GET    | `/api/health` | pública      | `{"status": "ok"}`                 |
| GET    | `/api/me`     | Bearer (JWT) | `{clerk_id, session_id, email}`    |

## Apagar

```bash
# Ctrl+C en las terminales de Django y Vite. Si usás Docker:
docker compose down          # detiene Postgres, conserva los datos
docker compose down -v       # además borra el volumen (datos)
```

## Próximos pasos

Modelos de negocio y endpoints de dominio protegidos con `ClerkAuth`, con
pertenencia por usuario (columna `clerk_id`, filtrando por `request.auth["sub"]`).
