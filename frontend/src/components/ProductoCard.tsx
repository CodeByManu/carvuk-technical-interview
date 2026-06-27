import { Minus, Plus } from "lucide-react";

import type { Producto } from "@/lib/types";
import { useCarrito } from "@/lib/carrito";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatearCLP } from "@/lib/format";

// Tarjeta de un producto del catálogo. Si todavía no está en el carrito muestra
// un botón "+"; una vez agregado, ese botón se reemplaza por un control de
// cantidad (− n +) en el mismo lugar, sin alterar el ancho de la tarjeta.
export function ProductoCard({ producto }: { producto: Producto }) {
  const { items, agregar, incrementar, decrementar } = useCarrito();
  const cantidad =
    items.find((i) => i.producto.id === producto.id)?.cantidad ?? 0;

  return (
    <Card className="flex h-full flex-col transition-shadow hover:shadow-md">
      <CardHeader className="flex-1">
        <CardTitle className="text-sm font-medium leading-snug">
          {producto.nombre}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-2">
        <span className="text-lg font-bold tabular-nums text-emerald-600">
          {formatearCLP(producto.precio)}
        </span>

        {cantidad === 0 ? (
          <Button
            size="icon"
            onClick={() => agregar(producto)}
            className="size-8 shrink-0 bg-emerald-600 text-white hover:bg-emerald-700"
            aria-label={`Agregar ${producto.nombre} al carrito`}
          >
            <Plus className="size-4" />
          </Button>
        ) : (
          <div className="flex shrink-0 items-center gap-1">
            <Button
              size="icon"
              variant="outline"
              className="size-8"
              onClick={() => decrementar(producto.id)}
              aria-label={`Quitar una unidad de ${producto.nombre}`}
            >
              <Minus className="size-3.5" />
            </Button>
            <span className="w-5 text-center text-sm font-bold tabular-nums text-emerald-600">
              {cantidad}
            </span>
            <Button
              size="icon"
              className="size-8 bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={() => incrementar(producto.id)}
              aria-label={`Agregar una unidad de ${producto.nombre}`}
            >
              <Plus className="size-3.5" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
