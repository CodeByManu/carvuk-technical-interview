# Carrito Feliz — Carvuk

Mini e-commerce: catálogo de productos, carrito de compras y generación de
**boletas** con cálculo automático de impuesto, historial por usuario y emisión
asíncrona contra un servicio externo (SII simulado) vía **webhook**.

**Producción:** https://carvuk-technical-interview.vercel.app/

- **Backend:** Django + django-ninja (API en `/api`), Postgres en Supabase.
- **Frontend:** React 19 + Vite + TypeScript + Tailwind v4 + shadcn/ui.
- **Auth:** Clerk (JWT verificado de forma stateless contra su JWKS).

## Funcionalidades

- **Catálogo:** 22 productos, con buscador (tolerante a tildes) y paginación.
- **Carrito:** agregar/quitar con cantidades; vive solo en el frontend.
- **Boletas:** se generan desde el carrito; los montos se calculan en el backend.
- **Historial:** boletas del usuario con su estado de emisión; el detalle muestra
  el desglose y, si está emitida, el Número SII y el link al PDF.
- **Bonus 1 — Clerk:** toda la API (salvo el webhook) exige sesión.
- **Bonus 2 — Emisión asíncrona + webhook** (ver más abajo).

## Cálculo del impuesto

Impuesto fijo del 15%, calculado siempre en el backend. El **bruto** es el total
a pagar por el cliente (la suma del carrito):

```
bruto    = suma del carrito        (ej. $4.200)
impuesto = round(bruto * 15%)      (ej. $630)
neto     = bruto - impuesto        (ej. $3.570)
```

## Levantar en local

Requisitos: Python 3.11+ y Node 18+. Una cuenta de Clerk; la DB usa Supabase.

```bash
# Variables de entorno
cp backend/.env.example backend/.env       # completar DB (Supabase) y CLERK_ISSUER
cp frontend/.env.example frontend/.env      # completar VITE_CLERK_PUBLISHABLE_KEY

# Backend (terminal A)
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 0.0.0.0:8000

# Frontend (terminal B)
cd frontend
npm install
npm run dev        # http://localhost:5173
```

Tests del backend (corren sobre SQLite en memoria):

```bash
cd backend && python manage.py test
```

Ante cualquier duda: **manueltagle2002@gmail.com**

## Bonus 2 — Emisión asíncrona + webhook

Al generar una boleta, el backend solicita la emisión al servicio externo
(Pipedream, que simula el SII) y la boleta queda en estado `pendiente`. El
servicio responde de forma asíncrona llamando a un **webhook** público
(`POST /api/webhooks/sii`), que actualiza la boleta a `emitida` con su Número SII
y PDF. El botón **Actualizar** del historial refleja el cambio.

El `callbackUrl` se arma con `PUBLIC_BASE_URL` + un token secreto (`?token=`) que
el webhook valida. En producción, `PUBLIC_BASE_URL` se deriva del dominio de
Railway, así que el webhook llega directo y no requiere configuración extra.

> El endpoint del SII tiene un límite de **100 requests** (cada boleta consume 1).

## Despliegue

- **Backend** en Railway (root `backend/`): build con `requirements.txt` y
  `Procfile` (`collectstatic` + `migrate` + `gunicorn`). El dominio del servicio
  se agrega solo a hosts/CSRF y define `PUBLIC_BASE_URL`.
- **Frontend** en Vercel (root `frontend/`): build de Vite, con `vercel.json`
  para el ruteo del SPA. Variables `VITE_API_URL` y `VITE_CLERK_PUBLISHABLE_KEY`.
- En el backend, `CORS_ALLOWED_ORIGINS` y `CLERK_AUTHORIZED_PARTIES` deben incluir
  la URL del frontend.

## Supuestos

- **Catálogo global de solo lectura**, sembrado por migración. Las **boletas son
  por usuario** (`clerk_id`); la identidad sale siempre del JWT, nunca del body.
- Impuesto según el ejemplo del enunciado (`bruto = total del carrito`).
- El carrito vive solo en el frontend (sin persistencia).
- Cada línea de boleta guarda un *snapshot* de nombre y precio.
- El estado de emisión se refresca manualmente (botón Actualizar).
- El webhook se autentica con un token compartido; valida que el PDF sea http(s)
  y solo actualiza boletas `pendiente` (idempotente).
- Tests sobre SQLite en memoria; RLS habilitado en las tablas de Supabase.
