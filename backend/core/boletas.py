"""Router de boletas: generación desde el carrito e historial por usuario.

Pertenencia: cada boleta lleva el `clerk_id` del dueño, que se setea desde el JWT
verificado (`request.auth["sub"]`), nunca desde el body. Todo query se filtra por
ese mismo id; una boleta de otro usuario responde 404.
"""
from django.db import transaction
from django.shortcuts import get_object_or_404
from ninja import Router
from ninja.errors import HttpError

from core.auth import ClerkAuth
from core.impuestos import calcular_montos
from core.models import Boleta, LineaBoleta, Producto
from core.schemas import BoletaCrearIn, BoletaDetalleOut, BoletaResumenOut

router = Router(auth=ClerkAuth())


@router.post("", response={201: BoletaDetalleOut})
def crear_boleta(request, datos: BoletaCrearIn):
    """Genera una boleta a partir de los items del carrito.

    Los precios y montos se recalculan desde la DB; lo único que se toma del
    cliente son los `producto_id` y las cantidades. Si algún producto no existe,
    no se crea nada (422).
    """
    # Cargamos los productos pedidos en un solo query.
    ids_pedidos = [item.producto_id for item in datos.items]
    productos = {p.id: p for p in Producto.objects.filter(id__in=ids_pedidos)}

    faltantes = [pid for pid in ids_pedidos if pid not in productos]
    if faltantes:
        raise HttpError(422, f"Productos inexistentes: {faltantes}")

    # Bruto = suma de (precio real de la DB x cantidad). Nunca del cliente.
    bruto = sum(productos[item.producto_id].precio * item.cantidad for item in datos.items)
    montos = calcular_montos(bruto)

    with transaction.atomic():
        boleta = Boleta.objects.create(
            clerk_id=request.auth["sub"],
            bruto=montos["bruto"],
            impuesto=montos["impuesto"],
            neto=montos["neto"],
        )
        LineaBoleta.objects.bulk_create(
            [
                LineaBoleta(
                    boleta=boleta,
                    producto=productos[item.producto_id],
                    # Snapshot: la boleta histórica no cambia si luego cambia el precio.
                    nombre=productos[item.producto_id].nombre,
                    precio_unitario=productos[item.producto_id].precio,
                    cantidad=item.cantidad,
                )
                for item in datos.items
            ]
        )

    return 201, _a_detalle(boleta)


@router.get("", response=list[BoletaResumenOut])
def listar_boletas(request):
    """Historial de boletas del usuario autenticado, más recientes primero."""
    boletas = (
        Boleta.objects.filter(clerk_id=request.auth["sub"])
        .prefetch_related("lineas")
    )
    return [
        BoletaResumenOut(
            id=b.id,
            creada_en=b.creada_en,
            bruto=b.bruto,
            impuesto=b.impuesto,
            neto=b.neto,
            cantidad_items=sum(linea.cantidad for linea in b.lineas.all()),
        )
        for b in boletas
    ]


@router.get("/{int:boleta_id}", response=BoletaDetalleOut)
def detalle_boleta(request, boleta_id: int):
    """Detalle con el desglose de líneas. 404 si la boleta es de otro usuario."""
    boleta = get_object_or_404(
        Boleta.objects.prefetch_related("lineas"),
        id=boleta_id,
        clerk_id=request.auth["sub"],
    )
    return _a_detalle(boleta)


def _a_detalle(boleta: Boleta) -> BoletaDetalleOut:
    """Arma el schema de detalle a partir de una boleta y sus líneas."""
    return BoletaDetalleOut(
        id=boleta.id,
        creada_en=boleta.creada_en,
        bruto=boleta.bruto,
        impuesto=boleta.impuesto,
        neto=boleta.neto,
        lineas=[
            {
                "nombre": linea.nombre,
                "precio_unitario": linea.precio_unitario,
                "cantidad": linea.cantidad,
                "subtotal": linea.subtotal,
            }
            for linea in boleta.lineas.all()
        ],
    )
