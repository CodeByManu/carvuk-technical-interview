"""django-ninja API.

`api` es la instancia raíz que config/urls.py monta bajo /api. A medida que
crezca el proyecto, se agregan routers por dominio con `api.add_router(...)`.
"""
from ninja import NinjaAPI

from core.auth import ClerkAuth
from core.boletas import router as boletas_router
from core.productos import router as productos_router

api = NinjaAPI(title="Carvuk API")


@api.get("/health")
def health(request):
    """Liveness check público usado por el frontend para verificar conectividad."""
    return {"status": "ok"}


@api.get("/me", auth=ClerkAuth())
def me(request):
    """Endpoint protegido: solo responde con un JWT de Clerk válido.

    `request.auth` contiene los claims que devolvió ClerkAuth.authenticate.
    En el modelo stateless, esa es toda la identidad que necesitamos.
    """
    claims = request.auth
    return {
        "clerk_id": claims["sub"],          # id del usuario en Clerk
        "session_id": claims.get("sid"),    # id de la sesión
        "email": claims.get("email"),       # solo si lo agregás al token (ver nota)
    }


# Routers de dominio. Cada uno exige JWT de Clerk (auth en el propio Router).
api.add_router("/productos", productos_router)
api.add_router("/boletas", boletas_router)
