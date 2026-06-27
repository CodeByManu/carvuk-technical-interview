"""Tests del core: cálculo de impuesto, recálculo desde la DB y pertenencia.

Para no depender de un JWT real de Clerk, parcheamos `ClerkAuth.authenticate`
para que trate el token como el `clerk_id` del usuario: un request con
`Authorization: Bearer user_a` se autentica como el usuario "user_a". Así
probamos la lógica real de los endpoints sin firmar tokens.
"""
import json
from unittest import mock

from django.test import TestCase, override_settings

from core.auth import ClerkAuth
from core.impuestos import calcular_montos
from core.models import Boleta, Producto


def _fake_auth(self, request, token):
    """El token plano se usa como clerk_id (solo para tests)."""
    return {"sub": token} if token else None


class CalcularMontosTest(TestCase):
    """La lógica de impuesto es la única fuente de verdad; la probamos aislada."""

    def test_ejemplo_del_enunciado(self):
        # 4200 -> impuesto 630 (15%) -> neto 3570.
        self.assertEqual(calcular_montos(4200), {"bruto": 4200, "impuesto": 630, "neto": 3570})

    def test_redondeo_al_peso(self):
        # 15% de 1000 = 150 exacto.
        self.assertEqual(calcular_montos(1000), {"bruto": 1000, "impuesto": 150, "neto": 850})
        # 15% de 999 = 149.85 -> 150 (redondeo al peso más cercano).
        self.assertEqual(calcular_montos(999), {"bruto": 999, "impuesto": 150, "neto": 849})


@mock.patch.object(ClerkAuth, "authenticate", _fake_auth)
class BoletasApiTest(TestCase):
    def setUp(self):
        self.leche = Producto.objects.create(nombre="Leche", precio=1100)
        self.aceite = Producto.objects.create(nombre="Aceite", precio=2000)
        # Mockeamos la emisión al SII: en tests NUNCA se llama de verdad (el
        # endpoint externo tiene un límite de 100 requests).
        patcher = mock.patch("core.boletas.emitir_en_background")
        self.mock_emitir = patcher.start()
        self.addCleanup(patcher.stop)

    def _crear(self, items, usuario="user_a"):
        return self.client.post(
            "/api/boletas",
            data=json.dumps({"items": items}),
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {usuario}",
        )

    def test_requiere_autenticacion(self):
        resp = self.client.get("/api/boletas")
        self.assertEqual(resp.status_code, 401)

    def test_crea_boleta_recalculando_desde_la_db(self):
        # El ejemplo del enunciado: 2 leches + 1 aceite = 4200.
        resp = self._crear([
            {"producto_id": self.leche.id, "cantidad": 2},
            {"producto_id": self.aceite.id, "cantidad": 1},
        ])
        self.assertEqual(resp.status_code, 201)
        body = resp.json()
        self.assertEqual(body["bruto"], 4200)
        self.assertEqual(body["impuesto"], 630)
        self.assertEqual(body["neto"], 3570)
        # El snapshot de líneas guarda nombre y precio reales.
        self.assertEqual(len(body["lineas"]), 2)
        linea_leche = next(l for l in body["lineas"] if l["nombre"] == "Leche")
        self.assertEqual(linea_leche["precio_unitario"], 1100)
        self.assertEqual(linea_leche["subtotal"], 2200)

    def test_ignora_precios_del_cliente(self):
        # Aunque el cliente mande basura, el schema solo acepta producto_id y
        # cantidad; el precio sale siempre de la DB.
        resp = self.client.post(
            "/api/boletas",
            data=json.dumps({"items": [{"producto_id": self.leche.id, "cantidad": 1, "precio": 1}]}),
            content_type="application/json",
            HTTP_AUTHORIZATION="Bearer user_a",
        )
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.json()["bruto"], 1100)

    def test_carrito_vacio_es_422(self):
        resp = self._crear([])
        self.assertEqual(resp.status_code, 422)
        self.assertEqual(Boleta.objects.count(), 0)

    def test_producto_inexistente_es_422(self):
        resp = self._crear([{"producto_id": 999999, "cantidad": 1}])
        self.assertEqual(resp.status_code, 422)
        self.assertEqual(Boleta.objects.count(), 0)

    def test_historial_es_por_usuario(self):
        self._crear([{"producto_id": self.leche.id, "cantidad": 1}], usuario="user_a")
        self._crear([{"producto_id": self.aceite.id, "cantidad": 1}], usuario="user_b")

        resp = self.client.get("/api/boletas", HTTP_AUTHORIZATION="Bearer user_a")
        self.assertEqual(resp.status_code, 200)
        boletas = resp.json()
        self.assertEqual(len(boletas), 1)
        self.assertEqual(boletas[0]["bruto"], 1100)

    def test_detalle_de_boleta_ajena_es_404(self):
        crear = self._crear([{"producto_id": self.leche.id, "cantidad": 1}], usuario="user_a")
        boleta_id = crear.json()["id"]

        # user_b intenta abrir la boleta de user_a.
        resp = self.client.get(
            f"/api/boletas/{boleta_id}", HTTP_AUTHORIZATION="Bearer user_b"
        )
        self.assertEqual(resp.status_code, 404)

        # El dueño sí la ve.
        resp_dueño = self.client.get(
            f"/api/boletas/{boleta_id}", HTTP_AUTHORIZATION="Bearer user_a"
        )
        self.assertEqual(resp_dueño.status_code, 200)

    def test_boleta_nace_pendiente_y_dispara_emision(self):
        crear = self._crear([{"producto_id": self.leche.id, "cantidad": 1}])
        body = crear.json()
        self.assertEqual(body["estado_sii"], "pendiente")
        # Se solicitó la emisión con el id de la boleta y el callbackUrl correcto.
        self.mock_emitir.assert_called_once()
        boleta_id, callback_url = self.mock_emitir.call_args.args
        self.assertEqual(boleta_id, body["id"])
        self.assertTrue(callback_url.endswith("/api/webhooks/sii"))


@mock.patch.object(ClerkAuth, "authenticate", _fake_auth)
class WebhookSiiTest(TestCase):
    """El webhook es público (sin JWT) y actualiza la boleta por documentId."""

    def setUp(self):
        # Creamos una boleta directa (sin pasar por el endpoint) para no gatillar
        # la emisión real.
        self.boleta = Boleta.objects.create(
            clerk_id="user_a", bruto=1100, impuesto=165, neto=935
        )

    def _webhook(self, payload):
        return self.client.post(
            "/api/webhooks/sii",
            data=json.dumps(payload),
            content_type="application/json",
        )

    def test_emite_la_boleta(self):
        resp = self._webhook(
            {
                "documentId": self.boleta.id,
                "status": "issued",
                "siiCode": "SII-123456",
                "pdfUrl": "https://example.com/boleta.pdf",
            }
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json(), {"ok": True})

        self.boleta.refresh_from_db()
        self.assertEqual(self.boleta.estado_sii, "emitida")
        self.assertEqual(self.boleta.sii_codigo, "SII-123456")
        self.assertEqual(self.boleta.pdf_url, "https://example.com/boleta.pdf")

    def test_documentid_desconocido_no_rompe(self):
        resp = self._webhook(
            {"documentId": 999999, "status": "issued", "siiCode": "X", "pdfUrl": ""}
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json(), {"ok": False})

    def test_no_requiere_jwt(self):
        # Sin header Authorization (no usa Clerk), igual responde: es público.
        resp = self._webhook(
            {"documentId": self.boleta.id, "status": "issued", "siiCode": "S", "pdfUrl": ""}
        )
        self.assertEqual(resp.status_code, 200)

    def test_descarta_pdf_con_esquema_peligroso(self):
        self._webhook(
            {
                "documentId": self.boleta.id,
                "status": "issued",
                "siiCode": "SII-1",
                "pdfUrl": "javascript:alert(1)",
            }
        )
        self.boleta.refresh_from_db()
        # La URL maliciosa no se persiste.
        self.assertEqual(self.boleta.pdf_url, "")

    def test_no_repisa_boleta_ya_emitida(self):
        # Primera entrega: queda emitida.
        self._webhook(
            {"documentId": self.boleta.id, "status": "issued", "siiCode": "SII-1", "pdfUrl": ""}
        )
        # Re-entrega con otros datos: no debe pisar (ya no está pendiente).
        resp = self._webhook(
            {"documentId": self.boleta.id, "status": "issued", "siiCode": "SII-2", "pdfUrl": ""}
        )
        self.assertEqual(resp.json(), {"ok": False})
        self.boleta.refresh_from_db()
        self.assertEqual(self.boleta.sii_codigo, "SII-1")


@mock.patch.object(ClerkAuth, "authenticate", _fake_auth)
@override_settings(SII_WEBHOOK_SECRET="secreto-de-prueba")
class WebhookSiiTokenTest(TestCase):
    """Con secreto configurado, el webhook exige el ?token= correcto."""

    def setUp(self):
        self.boleta = Boleta.objects.create(
            clerk_id="user_a", bruto=1100, impuesto=165, neto=935
        )

    def _payload(self):
        return json.dumps(
            {"documentId": self.boleta.id, "status": "issued", "siiCode": "SII-1", "pdfUrl": ""}
        )

    def test_token_correcto_emite(self):
        resp = self.client.post(
            "/api/webhooks/sii?token=secreto-de-prueba",
            data=self._payload(),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 200)
        self.boleta.refresh_from_db()
        self.assertEqual(self.boleta.estado_sii, "emitida")

    def test_token_invalido_es_401(self):
        resp = self.client.post(
            "/api/webhooks/sii?token=incorrecto",
            data=self._payload(),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 401)
        self.boleta.refresh_from_db()
        self.assertEqual(self.boleta.estado_sii, "pendiente")
