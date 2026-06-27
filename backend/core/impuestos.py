"""Cálculo de impuestos de las boletas — única fuente de verdad.

Según el enunciado, el *bruto* es el total a pagar por el cliente (la suma de los
precios del carrito). El impuesto es un 15% fijo de ese bruto y el neto es lo que
queda al descontarlo:

    bruto    = suma de precios del carrito
    impuesto = round(bruto * 15%)
    neto     = bruto - impuesto

Ejemplo del enunciado: bruto $4200 -> impuesto $630 -> neto $3570.

Tener esto centralizado garantiza que el impuesto se calcule de forma consistente
cada vez que se genera un documento, sin importar los productos.
"""
from decimal import Decimal, ROUND_HALF_UP

# Impuesto fijo del 15%, sin importar los productos.
TASA_IMPUESTO = Decimal("0.15")


def calcular_montos(bruto: int) -> dict[str, int]:
    """Devuelve {bruto, impuesto, neto} en CLP enteros a partir del bruto.

    El bruto ya debe venir calculado desde los precios reales de la DB, no del
    cliente. El impuesto se redondea al peso más cercano (CLP no tiene decimales).
    """
    impuesto = int(
        (Decimal(bruto) * TASA_IMPUESTO).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
    )
    return {"bruto": bruto, "impuesto": impuesto, "neto": bruto - impuesto}
