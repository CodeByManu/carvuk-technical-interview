import { useCallback, useEffect, useState } from "react";
import { Eye, Receipt } from "lucide-react";

import { useApi } from "@/lib/api";
import type { BoletaResumen } from "@/lib/types";
import { formatearCLP, formatearFecha } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BoletaDetalleDialog } from "@/components/BoletaDetalleDialog";

function etiquetaItems(n: number): string {
  return `${n} ${n === 1 ? "ítem" : "ítems"}`;
}

export function Boletas() {
  const api = useApi();
  const [boletas, setBoletas] = useState<BoletaResumen[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detalleId, setDetalleId] = useState<number | null>(null);

  const cargar = useCallback(() => {
    setError(null);
    setBoletas(null);
    api
      .listarBoletas()
      .then(setBoletas)
      .catch((e: Error) => setError(e.message));
  }, [api]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      <h1 className="mb-6 text-lg font-semibold">Historial de boletas</h1>

      {error ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-sm text-muted-foreground">
            No se pudo cargar el historial: {error}
          </p>
          <Button variant="outline" onClick={cargar}>
            Reintentar
          </Button>
        </div>
      ) : boletas === null ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : boletas.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">
          Aún no generaste boletas. Armá un carrito y generá la primera.
        </p>
      ) : (
        <ul className="space-y-3">
          {boletas.map((b) => (
            <li key={b.id}>
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="flex items-center justify-between gap-4 py-4">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                      <Receipt className="size-5" />
                    </span>
                    <div>
                      <p className="font-medium">Boleta #{b.id}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatearFecha(b.creada_en)} · {etiquetaItems(b.cantidad_items)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-base font-bold tabular-nums text-emerald-600">
                      {formatearCLP(b.bruto)}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDetalleId(b.id)}
                      className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                    >
                      <Eye className="size-4" />
                      Ver detalle
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <BoletaDetalleDialog id={detalleId} onClose={() => setDetalleId(null)} />
    </div>
  );
}
