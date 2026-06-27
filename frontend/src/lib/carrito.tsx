// Estado del carrito de compras. Vive solo en el frontend (sin persistencia,
// como pide el enunciado): es un Context que comparten el catálogo, el badge del
// header y el panel del carrito.
import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { Producto } from "@/lib/types";

export interface ItemCarrito {
  producto: Producto;
  cantidad: number;
}

interface CarritoContextValue {
  items: ItemCarrito[];
  totalItems: number;
  total: number; // Suma de precios = valor a pagar por el cliente (bruto).
  agregar: (producto: Producto) => void;
  incrementar: (productoId: number) => void;
  decrementar: (productoId: number) => void;
  quitar: (productoId: number) => void;
  vaciar: () => void;
}

const CarritoContext = createContext<CarritoContextValue | null>(null);

export function CarritoProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ItemCarrito[]>([]);

  // Acciones memoizadas: no dependen del estado actual (usan el updater de
  // setItems), así su identidad es estable.
  const acciones = useMemo(() => {
    // Suma o resta unidades; si la cantidad llega a 0, la línea desaparece.
    const cambiarCantidad = (productoId: number, delta: number) =>
      setItems((prev) =>
        prev
          .map((i) =>
            i.producto.id === productoId
              ? { ...i, cantidad: i.cantidad + delta }
              : i,
          )
          .filter((i) => i.cantidad > 0),
      );

    return {
      agregar: (producto: Producto) =>
        setItems((prev) => {
          const existente = prev.find((i) => i.producto.id === producto.id);
          if (existente) {
            return prev.map((i) =>
              i.producto.id === producto.id
                ? { ...i, cantidad: i.cantidad + 1 }
                : i,
            );
          }
          return [...prev, { producto, cantidad: 1 }];
        }),
      incrementar: (productoId: number) => cambiarCantidad(productoId, 1),
      decrementar: (productoId: number) => cambiarCantidad(productoId, -1),
      quitar: (productoId: number) =>
        setItems((prev) => prev.filter((i) => i.producto.id !== productoId)),
      vaciar: () => setItems([]),
    };
  }, []);

  const value = useMemo<CarritoContextValue>(() => {
    const totalItems = items.reduce((acc, i) => acc + i.cantidad, 0);
    const total = items.reduce((acc, i) => acc + i.producto.precio * i.cantidad, 0);
    return { items, totalItems, total, ...acciones };
  }, [items, acciones]);

  return <CarritoContext.Provider value={value}>{children}</CarritoContext.Provider>;
}

export function useCarrito() {
  const ctx = useContext(CarritoContext);
  if (!ctx) {
    throw new Error("useCarrito debe usarse dentro de <CarritoProvider>");
  }
  return ctx;
}
