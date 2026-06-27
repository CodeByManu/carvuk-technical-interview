"""Router del catálogo de productos.

El catálogo es global y de solo lectura: son los productos de la tienda,
sembrados por migración. Requiere sesión válida igual que el resto de la API.
"""
from ninja import Router

from core.auth import ClerkAuth
from core.models import Producto
from core.schemas import ProductoOut

router = Router(auth=ClerkAuth())


@router.get("", response=list[ProductoOut])
def listar_productos(request):
    """Devuelve el catálogo completo, ordenado por nombre."""
    return Producto.objects.all()
