import {
  Banana,
  Candy,
  Coffee,
  Croissant,
  CupSoda,
  Droplet,
  Egg,
  Fish,
  GlassWater,
  Ham,
  Milk,
  Minus,
  Package,
  Plus,
  Sandwich,
  ShoppingBasket,
  SprayCan,
  Wheat,
  type LucideIcon,
} from "lucide-react";

import type { Producto } from "@/lib/types";
import { useCarrito } from "@/lib/carrito";
import { cn, normalizarTexto } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatearCLP } from "@/lib/format";

// Ícono representativo según el nombre del producto (sin emojis, solo lucide).
const ICONOS: [string, LucideIcon][] = [
  ["leche", Milk],
  ["yogurt", Milk],
  ["queso", Sandwich],
  ["pan", Croissant],
  ["aceite", Droplet],
  ["arroz", Wheat],
  ["harina", Wheat],
  ["fideos", Wheat],
  ["azucar", Candy],
  ["huevo", Egg],
  ["jamon", Ham],
  ["pavo", Ham],
  ["cafe", Coffee],
  ["bolsitas", Coffee],
  ["atun", Fish],
  ["detergente", SprayCan],
  ["papel", Package],
  ["agua", GlassWater],
  ["bebida", CupSoda],
  ["cola", CupSoda],
  ["platano", Banana],
];

// Tintes suaves que rotan por producto para dar variedad visual (góndola).
const TINTES = [
  "bg-emerald-50 text-emerald-600",
  "bg-amber-50 text-amber-600",
  "bg-sky-50 text-sky-600",
  "bg-violet-50 text-violet-600",
  "bg-rose-50 text-rose-600",
  "bg-orange-50 text-orange-600",
];

function iconoDe(nombre: string): LucideIcon {
  const limpio = normalizarTexto(nombre);
  const match = ICONOS.find(([clave]) => limpio.includes(clave));
  return match ? match[1] : ShoppingBasket;
}

// Tarjeta de un producto: miniatura con ícono + precio destacado. Si todavía no
// está en el carrito muestra un botón "+"; una vez agregado, ese botón se
// reemplaza por un control de cantidad (− n +) en el mismo lugar.
export function ProductoCard({ producto }: { producto: Producto }) {
  const { items, agregar, incrementar, decrementar } = useCarrito();
  const cantidad =
    items.find((i) => i.producto.id === producto.id)?.cantidad ?? 0;
  const Icono = iconoDe(producto.nombre);
  const tinte = TINTES[producto.id % TINTES.length];

  return (
    <Card className="group flex h-full flex-col gap-0 overflow-hidden py-0 transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className={cn("flex h-24 items-center justify-center", tinte)}>
        <Icono
          className="size-9 transition-transform group-hover:scale-110"
          strokeWidth={1.5}
        />
      </div>

      <div className="flex flex-1 flex-col gap-3 p-3">
        <p className="line-clamp-2 text-sm font-medium leading-snug">
          {producto.nombre}
        </p>

        <div className="mt-auto flex items-center justify-between gap-2">
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
        </div>
      </div>
    </Card>
  );
}
