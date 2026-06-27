"""django-ninja API.

`api` es la instancia raíz que config/urls.py monta bajo /api. A medida que
crezca el proyecto, se agregan routers por dominio con `api.add_router(...)`.
"""
from ninja import NinjaAPI

from core.auth import ClerkAuth

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
