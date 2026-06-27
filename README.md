# Carrito Feliz — Carvuk

Mini e-commerce de barrio: catálogo de productos, carrito de compras y generación
de **boletas** con cálculo automático de impuesto, historial por usuario y
emisión asíncrona contra un servicio externo (SII simulado) vía **webhook**.

- **Backend**: Django + django-ninja (API REST en `/api`), Postgres en Supabase.
- **Frontend**: React 19 + Vite + TypeScript + Tailwind v4 + shadcn/ui.
- **Auth**: Clerk (JWT verificado de forma stateless contra su JWKS).

## Funcionalidades

- **Catálogo** (`/`): 22 productos sembrados, con buscador en vivo y paginación
  (15 por página).
- **Carrito** (panel lateral): agregar/quitar con cantidades, vive solo en el
  frontend. Se puede sumar/restar desde la misma tarjeta del producto.
- **Generar boleta**: crea la boleta desde el carrito; los montos se calculan en
  el backend (nunca se confían al cliente).
- **Historial** (`/receipt`): lista de boletas del usuario con su estado de
  emisión; el detalle muestra el desglose y, cuando está emitida, el Número SII
  y el link al PDF.
- **Bonus 1 — Auth Clerk**: toda la API (salvo el webhook) exige sesión.
- **Bonus 2 — Emisión asíncrona + webhook**: ver sección dedicada abajo.

## Cálculo del impuesto

Impuesto **fijo del 15%**, calculado siempre en el backend
(`backend/core/impuestos.py`). Siguiendo el ejemplo del enunciado, el **bruto** es
el total a pagar por el cliente (la suma del carrito):

```
bruto    = suma de precios del carrito        (ej. $4.200)
impuesto = round(bruto * 15%)                  (ej. $630)
neto     = bruto - impuesto                    (ej. $3.570)
```

Montos en CLP enteros (sin decimales). Se cumple `neto + impuesto = total`.

---

## Levantar en local

### Requisitos

- Python 3.11+ · Node 18+
- Cuenta de [Clerk](https://dashboard.clerk.com). La DB ya apunta a Supabase; si
  preferís Postgres local hay un `docker-compose.yml` de respaldo.

### 0. Variables de entorno

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Completá en `backend/.env` los datos de la DB (bloque Supabase) y de Clerk
(`CLERK_ISSUER`), y en `frontend/.env` la `VITE_CLERK_PUBLISHABLE_KEY`.

### 1. Backend (terminal A)

```bash
cd backend
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

Verificación: `curl http://localhost:8000/api/health` → `{"status": "ok"}`.
Docs interactivas: http://localhost:8000/api/docs

### 2. Frontend (terminal B)

```bash
cd frontend
npm install
npm run dev
```

Abrí http://localhost:5173 → pantalla de inicio de sesión / registro de Clerk.

### Tests del backend

```bash
cd backend
python manage.py test          # corren sobre SQLite en memoria (no tocan Supabase)
```

---

## Bonus 2 — Emisión asíncrona + webhook

Al generar una boleta, el backend solicita la emisión al servicio externo
(Pipedream, que simula el SII) con un `POST` a `SII_EMISION_URL`:

```json
{ "callbackUrl": "https://<base-publica>/api/webhooks/sii", "documentId": <id-boleta> }
```

El servicio responde **asíncronamente** llamando a ese `callbackUrl`:

```json
{ "documentId": 123, "status": "issued", "siiCode": "SII-123456", "pdfUrl": "https://....pdf" }
```

Flujo en el código:

1. La boleta nace con `estado_sii = "pendiente"`. La solicitud al SII se dispara
   en un **thread en background** (`backend/core/sii.py`) para no bloquear la
   respuesta.
2. El webhook **público** `POST /api/webhooks/sii` (`backend/core/webhooks.py`)
   recibe el resultado, ubica la boleta por `documentId` (= su id) y la pasa a
   `emitida` con su Número SII y PDF.
3. En el frontend, el historial muestra el estado con un badge; el botón
   **Actualizar** vuelve a consultar para ver el paso `pendiente → emitida`.

> **Nota de límite**: el endpoint del SII tiene **100 requests** disponibles.
> Cada boleta generada consume 1. Los tests **mockean** esta llamada y nunca le
> pegan de verdad.

### Cómo recibir el webhook en local (ngrok)

Como Pipedream no puede llamar a `localhost`, se expone el backend con un túnel:

```bash
# 1. Con el backend corriendo en :8000, en otra terminal:
ngrok http 8000
# 2. Copiá la URL pública que da ngrok, ej: https://abcd1234.ngrok-free.app
```

En `backend/.env` seteá esa URL como base pública del callback y permití el host:

```bash
PUBLIC_BASE_URL=https://abcd1234.ngrok-free.app
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1,.ngrok-free.app
```

Reiniciá el backend. Ahora, al generar una boleta:

- El SII recibe la solicitud y llama de vuelta a
  `https://abcd1234.ngrok-free.app/api/webhooks/sii`.
- La boleta pasa a **Emitida** (botón **Actualizar** en el historial) con su
  Número SII y el link al PDF.

---

## Endpoints

| Método | Ruta                    | Auth         | Descripción                                |
| ------ | ----------------------- | ------------ | ------------------------------------------ |
| GET    | `/api/health`           | pública      | Liveness check                             |
| GET    | `/api/me`               | Bearer (JWT) | Claims del usuario                         |
| GET    | `/api/productos`        | Bearer (JWT) | Catálogo                                   |
| POST   | `/api/boletas`          | Bearer (JWT) | Crea boleta desde el carrito               |
| GET    | `/api/boletas`          | Bearer (JWT) | Historial del usuario                      |
| GET    | `/api/boletas/{id}`     | Bearer (JWT) | Detalle (404 si es de otro usuario)        |
| POST   | `/api/webhooks/sii`     | pública      | Webhook de resultado de emisión (SII)      |

---

## Supuestos tomados

- **Catálogo global de solo lectura**, sembrado por migración (los productos son
  de la tienda). Las **boletas son por usuario** (columna `clerk_id`); la
  identidad sale siempre del JWT (`request.auth["sub"]`), nunca del body.
- **Impuesto** según el ejemplo literal del enunciado (`bruto = total del
  carrito`, `impuesto = 15% del bruto`, `neto = bruto − impuesto`).
- El **carrito** vive solo en el frontend (sin persistencia), con cantidades.
- Cada **línea de boleta** guarda un *snapshot* de nombre y precio: la boleta
  histórica no cambia si después cambia el precio del producto.
- El **estado de emisión se refresca manualmente** (botón Actualizar), sin
  polling automático.
- El **webhook es público** (sin firma) por simplicidad del ejercicio; en
  producción se aseguraría con un secreto/HMAC.
- **RLS habilitado** (deny-all) en las tablas de dominio para cerrar la Data API
  de Supabase; Django se conecta como rol `postgres` (que tiene BYPASSRLS), así
  que no lo afecta. Ver migración `core/0003_habilitar_rls`.
- **Tests sobre SQLite en memoria** (rápidos y aislados; el dominio no usa nada
  específico de Postgres).

## Estructura

```
backend/   Django + django-ninja. Dominio en core/ (models, impuestos, productos,
           boletas, sii, webhooks, schemas, auth). Migraciones versionadas.
frontend/  Vite + React 19. UI en src/components, estado de carrito y cliente API
           en src/lib. Componentes shadcn/ui en src/components/ui.
```
