import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Minus, Plus, Receipt, ShoppingCart, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useApi } from "@/lib/api";
import { useCarrito } from "@/lib/carrito";
import { formatearCLP } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

// Botón de carrito en el header (con badge de cantidad) que abre un panel
// lateral con los items, sus cantidades, el total y la generación de boleta.
export function CarritoSheet() {
  const { items, totalItems, total, incrementar, decrementar, quitar, vaciar } =
    useCarrito();
  const navigate = useNavigate();
  const api = useApi();
  const [open, setOpen] = useState(false);
  const [generando, setGenerando] = useState(false);

  const generarBoleta = async () => {
    setGenerando(true);
    try {
      const boleta = await api.crearBoleta(
        items.map((i) => ({ producto_id: i.producto.id, cantidad: i.cantidad })),
      );
      vaciar();
      setOpen(false);
      navigate("/receipt");
      toast.success(`Boleta #${boleta.id} generada`);
    } catch (e) {
      toast.error(`No se pudo generar la boleta: ${(e as Error).message}`);
    } finally {
      setGenerando(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative"
          aria-label="Abrir carrito"
        >
          <ShoppingCart className="size-4" />
          {totalItems > 0 && (
            <Badge className="absolute -right-2 -top-2 size-5 justify-center rounded-full p-0 text-xs tabular-nums">
              {totalItems}
            </Badge>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Tu carrito</SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-1 items-center justify-center px-4">
            <p className="text-sm text-muted-foreground">
              Tu carrito está vacío.
            </p>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1">
              <ul className="divide-y px-4">
                {items.map((item) => (
                  <li
                    key={item.producto.id}
                    className="flex items-center gap-3 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium leading-tight">
                        {item.producto.nombre}
                      </p>
                      <p className="text-xs tabular-nums text-muted-foreground">
                        {formatearCLP(item.producto.precio)} c/u
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="outline"
                        className="size-7"
                        onClick={() => decrementar(item.producto.id)}
                        aria-label="Quitar una unidad"
                      >
                        <Minus className="size-3" />
                      </Button>
                      <span className="w-6 text-center text-sm tabular-nums">
                        {item.cantidad}
                      </span>
                      <Button
                        size="icon"
                        variant="outline"
                        className="size-7"
                        onClick={() => incrementar(item.producto.id)}
                        aria-label="Agregar una unidad"
                      >
                        <Plus className="size-3" />
                      </Button>
                    </div>

                    <span className="w-20 text-right text-sm font-medium tabular-nums">
                      {formatearCLP(item.producto.precio * item.cantidad)}
                    </span>

                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7 text-muted-foreground"
                      onClick={() => quitar(item.producto.id)}
                      aria-label={`Eliminar ${item.producto.nombre} del carrito`}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            </ScrollArea>

            <div className="space-y-3 border-t p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Total ({totalItems} {totalItems === 1 ? "ítem" : "ítems"})
                </span>
                <span className="text-lg font-bold tabular-nums text-emerald-600">
                  {formatearCLP(total)}
                </span>
              </div>
              <Button
                className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
                onClick={generarBoleta}
                disabled={generando}
              >
                <Receipt className="size-4" />
                {generando ? "Generando..." : "Generar boleta"}
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
