"""Webhook del servicio externo de timbrado (SII simulado por Pipedream).

Endpoint PÚBLICO (no usa JWT de Clerk): lo invoca el servicio externo, no el
usuario. Para autenticarlo igual, el callbackUrl que enviamos al SII incluye un
token secreto (`?token=`) que verificamos acá con `hmac.compare_digest`.
"""
import hmac

from django.conf import settings
from ninja import Router
from ninja.errors import HttpError

from core.models import Boleta
from core.schemas import WebhookSiiIn

router = Router()  # sin auth de Clerk: lo llama el SII, no el frontend


def _token_valido(request) -> bool:
    """Compara el `?token=` del callback con el secreto configurado.

    Si no hay secreto configurado, no se exige token (modo dev).
    """
    secreto = settings.SII_WEBHOOK_SECRET
    if not secreto:
        return True
    recibido = request.GET.get("token", "")
    return hmac.compare_digest(recibido, secreto)


def _pdf_seguro(url: str | None) -> str:
    """Solo acepta URLs http(s); descarta esquemas peligrosos (javascript:, etc.)."""
    if url and url.startswith(("http://", "https://")):
        return url
    return ""


@router.post("/sii")
def recibir_sii(request, datos: WebhookSiiIn):
    """Actualiza la boleta con el resultado del timbrado.

    - Verifica el token compartido (401 si no coincide).
    - Solo actualiza boletas en estado `pendiente` (idempotente: una re-entrega
      no pisa una boleta ya emitida).
    - Responde 200 al SII (cuyo endpoint tiene requests limitadas).
    """
    if not _token_valido(request):
        raise HttpError(401, "Token de webhook inválido.")

    estado = (
        Boleta.ESTADO_EMITIDA if datos.status == "issued" else Boleta.ESTADO_ERROR
    )
    actualizadas = Boleta.objects.filter(
        id=datos.documentId, estado_sii=Boleta.ESTADO_PENDIENTE
    ).update(
        estado_sii=estado,
        sii_codigo=datos.siiCode or "",
        pdf_url=_pdf_seguro(datos.pdfUrl),
    )
    return {"ok": actualizadas == 1}
