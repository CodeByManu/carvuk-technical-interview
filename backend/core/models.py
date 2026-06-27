"""Modelos de dominio de Carvuk: catálogo y boletas.

El catálogo (`Producto`) es global y de solo lectura para los usuarios: son los
productos de la tienda, sembrados por migración. Las boletas, en cambio, son por
usuario (patrón de pertenencia por `clerk_id`): cada query se filtra por el dueño
y este se setea desde el JWT, nunca desde el body.
"""
from django.db import models


class Producto(models.Model):
    """Producto del catálogo de la tienda. Precio unitario en CLP, entero."""

    nombre = models.CharField(max_length=120)
    precio = models.PositiveIntegerField(help_text="Precio unitario en CLP, sin decimales.")

    class Meta:
        ordering = ["nombre"]

    def __str__(self):
        return f"{self.nombre} (${self.precio})"


class Boleta(models.Model):
    """Documento tributario generado a partir de un carrito.

    Los montos (bruto, impuesto, neto) se calculan y persisten en el backend
    (ver `core.impuestos`); nunca se confían al cliente. La boleta pertenece al
    usuario que la emitió, identificado por su `clerk_id`.
    """

    # Estados de la emisión asíncrona contra el SII (Bonus 2).
    ESTADO_PENDIENTE = "pendiente"
    ESTADO_EMITIDA = "emitida"
    ESTADO_ERROR = "error"
    ESTADOS_SII = [
        (ESTADO_PENDIENTE, "Pendiente"),
        (ESTADO_EMITIDA, "Emitida"),
        (ESTADO_ERROR, "Error"),
    ]

    clerk_id = models.CharField(max_length=255, db_index=True)
    creada_en = models.DateTimeField(auto_now_add=True)

    # Montos congelados al momento de emitir, en CLP enteros.
    bruto = models.PositiveIntegerField()
    impuesto = models.PositiveIntegerField()
    neto = models.PositiveIntegerField()

    # Emisión contra el SII (Bonus 2). Nace "pendiente"; el webhook la pasa a
    # "emitida" con su número y PDF, o queda "error" si la solicitud falla.
    estado_sii = models.CharField(
        max_length=20, choices=ESTADOS_SII, default=ESTADO_PENDIENTE
    )
    sii_codigo = models.CharField(max_length=50, blank=True, default="")
    pdf_url = models.URLField(blank=True, default="")

    class Meta:
        ordering = ["-creada_en"]

    def __str__(self):
        return f"Boleta #{self.pk} - ${self.bruto}"


class LineaBoleta(models.Model):
    """Línea de una boleta.

    Guarda un snapshot del producto (nombre y precio) al momento de emitir, para
    que la boleta histórica no cambie si después cambia el precio del producto en
    el catálogo. La FK a `Producto` es solo una referencia y puede quedar en null
    si el producto se elimina.
    """

    boleta = models.ForeignKey(Boleta, related_name="lineas", on_delete=models.CASCADE)
    producto = models.ForeignKey(Producto, null=True, on_delete=models.SET_NULL)
    nombre = models.CharField(max_length=120)
    precio_unitario = models.PositiveIntegerField()
    cantidad = models.PositiveIntegerField()

    @property
    def subtotal(self) -> int:
        """Precio de la línea: precio unitario por cantidad, en CLP enteros."""
        return self.precio_unitario * self.cantidad

    def __str__(self):
        return f"{self.cantidad}x {self.nombre}"
