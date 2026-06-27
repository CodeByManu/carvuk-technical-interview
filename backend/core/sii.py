"""Cliente del servicio externo de timbrado (SII simulado por Pipedream).

El flujo es asíncrono: hacemos un POST solicitando la emisión y el servicio nos
notifica el resultado por webhook (ver `core.webhooks`). Usamos `urllib` de la
stdlib para no sumar dependencias.

OJO: el endpoint tiene un límite de 100 requests, así que en los tests esta
función se mockea y nunca se llama de verdad.
"""
import json
import logging
import threading
import urllib.error
import urllib.request

from django.conf import settings

logger = logging.getLogger(__name__)


def solicitar_emision(boleta_id: int, callback_url: str) -> None:
    """POST al SII pidiendo emitir el documento.

    Es bloqueante (pensado para correr en un thread). El `documentId` es el id de
    la boleta, que el webhook usará para identificarla al responder. Si la
    solicitud falla, marca la boleta como `error`.
    """
    payload = json.dumps(
        {"callbackUrl": callback_url, "documentId": boleta_id}
    ).encode()
    req = urllib.request.Request(
        settings.SII_EMISION_URL,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            resp.read()
        logger.info("Emisión SII solicitada para boleta %s", boleta_id)
    except (urllib.error.URLError, TimeoutError, ValueError) as e:
        logger.error("Falló la emisión SII de la boleta %s: %s", boleta_id, e)
        _marcar_error(boleta_id)


def emitir_en_background(boleta_id: int, callback_url: str) -> None:
    """Lanza `solicitar_emision` en un thread daemon para no bloquear el request."""

    def tarea():
        try:
            solicitar_emision(boleta_id, callback_url)
        finally:
            # El thread tiene su propia conexión a la DB; la cerramos al terminar.
            from django.db import connections

            connections.close_all()

    threading.Thread(target=tarea, daemon=True).start()


def _marcar_error(boleta_id: int) -> None:
    from core.models import Boleta

    Boleta.objects.filter(id=boleta_id).update(estado_sii=Boleta.ESTADO_ERROR)
