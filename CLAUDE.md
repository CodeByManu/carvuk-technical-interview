# CLAUDE.md — Carvuk

Monorepo full-stack para una prueba técnica evaluada por **calidad y que todo
funcione**. Backend Django + django-ninja, frontend React 19 + Vite, auth con
Clerk (JWT stateless), DB Postgres en Supabase.

## Estado actual

- **Auth Clerk** funcionando end-to-end: login (modal) → dashboard con nombre →
  cerrar sesión. En `frontend/src/App.tsx`. `ClerkProvider` en `main.tsx`.
- **Backend stateless**: verifica el JWT de Clerk contra su JWKS, no guarda
  usuarios. La identidad sale de los claims. En `backend/core/auth.py`.
- **DB**: conectada a **Supabase** (proyecto carvuk-app, Session Pooler,
  us-west-2). Sin tablas de dominio ni migraciones aplicadas todavía.
- **Endpoints** (`backend/core/api.py`): `GET /api/health` (público),
  `GET /api/me` (Bearer JWT).

## Comandos (usar tal cual)

El venv NO se activa: se invoca el binario directo para que los comandos sean
estables y sin fricción.

**Backend** (desde `backend/`):
- Servidor: `venv/bin/python manage.py runserver 0.0.0.0:8000`
- Migrar: `venv/bin/python manage.py makemigrations` → `venv/bin/python manage.py migrate`
- Tests: `venv/bin/python manage.py test`
- Check: `venv/bin/python manage.py check`
- Shell ad-hoc: `venv/bin/python manage.py shell -c "..."`

**Frontend** (desde `frontend/`):
- Dev server: `npm run dev`
- Type-check + build: `npm run build`
- Solo type-check: `npx tsc -b`

**DB**: Supabase ya está en `backend/.env`. Docker local es fallback opcional:
`docker compose up -d`.

## Verificación — obligatoria antes de dar algo por terminado

La prueba se evalúa por "que todo funcione bien". Después de cada cambio:
1. Backend → `manage.py check` + probar el endpoint (curl o `/api/docs`).
2. Frontend → `npx tsc -b` con **cero errores** + abrir en el navegador.
3. Correr la app de verdad. Nunca cerrar una tarea solo porque "compila".

## Convenciones

- **Idioma**: comentarios y mensajes en **español**, igual que el código actual.
- **Identidad**: viene SIEMPRE del JWT verificado (`request.auth["sub"]`), nunca
  del body del request.
- **API**: django-ninja. Nuevo dominio → un router por archivo +
  `api.add_router(...)` en `core/api.py`.
- **Datos por usuario (patrón de pertenencia)**: la tabla lleva
  `clerk_id = models.CharField(max_length=255, db_index=True)`. Todo query se
  filtra por `request.auth["sub"]`. Al crear, el dueño se setea desde el token,
  nunca desde el body. Para un recurso por id:
  `get_object_or_404(Model, id=..., clerk_id=request.auth["sub"])` → devuelve
  404 (no 403) si es de otro usuario.
- **Migraciones**: crear tablas SIEMPRE con `makemigrations`/`migrate`, nunca a
  mano en el SQL Editor de Supabase. Se versionan en git.
- **Entregar completo**: sin TODOs ni piezas a medias. Código funcional y ya
  verificado.

## Calidad

Antes de commitear: `/code-review`, type-check limpio y app verificada en el
navegador. El evaluador presta atención al detalle.

## No tocar

`backend/.env`, `frontend/.env`, `.env` (raíz) → secretos reales de Clerk y
Supabase. Están git-ignored; no los muevas ni los imprimas.
