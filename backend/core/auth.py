"""Autenticación stateless contra Clerk.

Clerk firma cada JWT de sesión con su clave privada (RS256). Nosotros bajamos
las claves PÚBLICAS de Clerk (su JWKS) y verificamos la firma localmente, sin
llamar a la API de Clerk en cada request. Si el token es válido, confiamos en
sus claims; no guardamos nada en la DB.
"""
import jwt
from jwt import PyJWKClient
from django.conf import settings
from ninja.security import HttpBearer

# Cliente JWKS perezoso: se crea en el primer request protegido, no al importar.
# Así la app arranca (y /health responde) aunque Clerk no esté configurado todavía.
# Una vez creado, PyJWKClient cachea las claves en memoria y solo vuelve a
# pegarle a Clerk si aparece un `kid` (key id) que no conoce.
_jwks_client: PyJWKClient | None = None


def _get_jwks_client() -> PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        if not settings.CLERK_ISSUER:
            raise RuntimeError(
                "CLERK_ISSUER no está configurado en el entorno (backend/.env)."
            )
        _jwks_client = PyJWKClient(settings.CLERK_JWKS_URL)
    return _jwks_client


class ClerkAuth(HttpBearer):
    """Verifica el `Authorization: Bearer <token>` que manda el frontend.

    django-ninja extrae el token del header y lo pasa a `authenticate`.
    - Si devolvemos un valor truthy -> queda en `request.auth` y el request pasa.
    - Si devolvemos None (o lanzamos) -> ninja responde 401 automáticamente.
    """

    def authenticate(self, request, token):
        try:
            # Elegimos la clave pública correcta según el `kid` del header del JWT.
            signing_key = _get_jwks_client().get_signing_key_from_jwt(token)

            # Verificación criptográfica + de claims. Si algo falla, jwt.decode
            # lanza una PyJWTError (firma inválida, expirado, issuer distinto,
            # falta un claim requerido) que atrapamos abajo -> 401.
            claims = jwt.decode(
                token,
                signing_key.key,
                algorithms=["RS256"],          # Clerk firma sus JWT con RS256.
                issuer=settings.CLERK_ISSUER,  # rechaza tokens de otra instancia.
                leeway=10,                     # 10s de tolerancia por desfase de reloj.
                options={
                    # Exigimos que el token traiga estos claims; sin ellos, inválido.
                    "require": ["exp", "iat", "sub"],
                    "verify_exp": True,
                    "verify_iss": True,
                },
            )

            # Defensa extra: si el token trae `azp` (authorized party), exigí que
            # sea un origen conocido. Mitiga que un token robado se reuse desde
            # otro origen. Si no trae `azp`, no bloqueamos (depende del flujo).
            azp = claims.get("azp")
            if azp and azp not in settings.CLERK_AUTHORIZED_PARTIES:
                return None

            return claims

        except jwt.PyJWTError:
            # Firma inválida, token expirado, issuer incorrecto, etc. -> 401.
            return None
