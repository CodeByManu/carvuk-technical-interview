import { useCallback, useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";

import { useApi } from "@/lib/api";
import type { Producto } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductoCard } from "@/components/ProductoCard";

const GRID =
  "grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6";

export function Catalogo() {
  const api = useApi();
  const [productos, setProductos] = useState<Producto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");

  const cargar = useCallback(() => {
    setError(null);
    setProductos(null);
    api
      .listarProductos()
      .then(setProductos)
      .catch((e: Error) => setError(e.message));
  }, [api]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Búsqueda en vivo del lado del cliente: el catálogo es chico (no vale la pena
  // ir al backend por cada tecla).
  const filtrados = useMemo(() => {
    if (!productos) return [];
    const q = busqueda.trim().toLowerCase();
    if (!q) return productos;
    return productos.filter((p) => p.nombre.toLowerCase().includes(q));
  }, [productos, busqueda]);

  return (
    <div className="w-full px-4 py-6 sm:px-6 lg:px-8">
      <div className="relative mb-6 max-w-xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar producto..."
          className="pl-9"
          aria-label="Buscar producto"
        />
      </div>

      {error ? (
        <EstadoError mensaje={error} onReintentar={cargar} />
      ) : productos === null ? (
        <GridSkeleton />
      ) : filtrados.length === 0 ? (
        <SinResultados busqueda={busqueda} />
      ) : (
        <div className={GRID}>
          {filtrados.map((p) => (
            <ProductoCard key={p.id} producto={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className={GRID}>
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-28 w-full" />
      ))}
    </div>
  );
}

function SinResultados({ busqueda }: { busqueda: string }) {
  return (
    <p className="py-16 text-center text-sm text-muted-foreground">
      {busqueda.trim()
        ? `No hay productos que coincidan con "${busqueda.trim()}".`
        : "El catálogo está vacío."}
    </p>
  );
}

function EstadoError({
  mensaje,
  onReintentar,
}: {
  mensaje: string;
  onReintentar: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <p className="text-sm text-muted-foreground">
        No se pudo cargar el catálogo: {mensaje}
      </p>
      <Button variant="outline" onClick={onReintentar}>
        Reintentar
      </Button>
    </div>
  );
}
