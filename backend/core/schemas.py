"""Schemas de entrada/salida de la API (contratos django-ninja).

Separamos los schemas de entrada (lo que acepta el backend) de los de salida (lo
que devuelve), para no exponer ni aceptar campos de más. Los montos de las
boletas nunca se aceptan desde el cliente: se calculan en el backend.
"""
from datetime import datetime

from ninja import Schema
from pydantic import Field


# --- Catálogo ---------------------------------------------------------------
class ProductoOut(Schema):
    id: int
    nombre: str
    precio: int


# --- Entrada: crear boleta desde el carrito ---------------------------------
class ItemCarritoIn(Schema):
    producto_id: int
    cantidad: int = Field(ge=1, description="Unidades del producto, mínimo 1.")


class BoletaCrearIn(Schema):
    items: list[ItemCarritoIn] = Field(min_length=1, description="Carrito no vacío.")


# --- Salida: boletas --------------------------------------------------------
class LineaBoletaOut(Schema):
    nombre: str
    precio_unitario: int
    cantidad: int
    subtotal: int


class BoletaResumenOut(Schema):
    """Vista de lista para el historial."""

    id: int
    creada_en: datetime
    bruto: int
    impuesto: int
    neto: int
    cantidad_items: int
    estado_sii: str
    sii_codigo: str
    pdf_url: str


class BoletaDetalleOut(Schema):
    """Vista de detalle con el desglose de líneas."""

    id: int
    creada_en: datetime
    bruto: int
    impuesto: int
    neto: int
    estado_sii: str
    sii_codigo: str
    pdf_url: str
    lineas: list[LineaBoletaOut]


# --- Bonus 2: webhook del SII -----------------------------------------------
class WebhookSiiIn(Schema):
    """Cuerpo que envía el servicio externo al notificar el resultado.

    Los nombres son camelCase para calzar con el payload del SII tal cual llega.
    """

    documentId: int
    status: str
    siiCode: str | None = None
    pdfUrl: str | None = None
