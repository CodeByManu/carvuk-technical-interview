import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";

import { useApi } from "@/lib/api";
import type { Producto } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductoCard } from "@/components/ProductoCard";

const POR_PAGINA = 15;
const GRID = "grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5";

export function Catalogo() {
  const api = useApi();
  const [productos, setProductos] = useState<Producto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [pagina, setPagina] = useState(1);

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

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));

  // Si la búsqueda reduce los resultados, no quedarse en una página inexistente.
  useEffect(() => {
    setPagina((p) => Math.min(p, totalPaginas));
  }, [totalPaginas]);

  const visibles = filtrados.slice(
    (pagina - 1) * POR_PAGINA,
    pagina * POR_PAGINA,
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="relative mb-6 max-w-xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={busqueda}
          onChange={(e) => {
            setBusqueda(e.target.value);
            setPagina(1);
          }}
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
        <>
          <div className={GRID}>
            {visibles.map((p) => (
              <ProductoCard key={p.id} producto={p} />
            ))}
          </div>
          <Paginador
            pagina={pagina}
            totalPaginas={totalPaginas}
            onCambiar={setPagina}
          />
        </>
      )}
    </div>
  );
}

function Paginador({
  pagina,
  totalPaginas,
  onCambiar,
}: {
  pagina: number;
  totalPaginas: number;
  onCambiar: (p: number) => void;
}) {
  if (totalPaginas <= 1) return null;

  return (
    <div className="mt-8 flex items-center justify-center gap-2">
      <Button
        variant="outline"
        size="icon"
        onClick={() => onCambiar(pagina - 1)}
        disabled={pagina === 1}
        aria-label="Página anterior"
      >
        <ChevronLeft className="size-4" />
      </Button>
      <span className="px-2 text-sm text-muted-foreground tabular-nums">
        Página {pagina} de {totalPaginas}
      </span>
      <Button
        variant="outline"
        size="icon"
        onClick={() => onCambiar(pagina + 1)}
        disabled={pagina === totalPaginas}
        aria-label="Página siguiente"
      >
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className={GRID}>
      {Array.from({ length: POR_PAGINA }).map((_, i) => (
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
