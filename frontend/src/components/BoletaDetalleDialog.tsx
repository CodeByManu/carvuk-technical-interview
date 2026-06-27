import { useEffect, useState } from "react";
import { ExternalLink, FileText } from "lucide-react";

import { useApi } from "@/lib/api";
import type { BoletaDetalle } from "@/lib/types";
import { formatearCLP, formatearFecha } from "@/lib/format";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { EstadoSiiBadge } from "@/components/EstadoSiiBadge";

// Solo permitimos abrir enlaces http(s); evita esquemas peligrosos como
// "javascript:" en el href (XSS).
function esUrlSegura(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

// Detalle de una boleta: productos que incluía y el desglose neto / impuesto /
// total. Se carga al abrir (cuando `id` deja de ser null).
export function BoletaDetalleDialog({
  id,
  onClose,
}: {
  id: number | null;
  onClose: () => void;
}) {
  const api = useApi();
  const [detalle, setDetalle] = useState<BoletaDetalle | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id === null) {
      setDetalle(null);
      setError(null);
      return;
    }
    let activo = true;
    setDetalle(null);
    setError(null);
    api
      .detalleBoleta(id)
      .then((d) => activo && setDetalle(d))
      .catch((e: Error) => activo && setError(e.message));
    return () => {
      activo = false;
    };
  }, [id, api]);

  return (
    <Dialog open={id !== null} onOpenChange={(abierto) => !abierto && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>{detalle ? `Boleta #${detalle.id}` : "Boleta"}</DialogTitle>
            {detalle && <EstadoSiiBadge estado={detalle.estado_sii} />}
          </div>
          <DialogDescription>
            {detalle ? formatearFecha(detalle.creada_en) : "Cargando detalle..."}
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No se pudo cargar el detalle: {error}
          </p>
        ) : !detalle ? (
          <div className="space-y-2 py-2">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-2/3" />
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground">
                  <th className="pb-2 text-left font-normal">Producto</th>
                  <th className="pb-2 text-center font-normal">Cant.</th>
                  <th className="pb-2 text-right font-normal">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {detalle.lineas.map((linea, i) => (
                  <tr key={i} className="border-t align-top">
                    <td className="py-2">
                      {linea.nombre}
                      <span className="block text-xs tabular-nums text-muted-foreground">
                        {formatearCLP(linea.precio_unitario)} c/u
                      </span>
                    </td>
                    <td className="py-2 text-center tabular-nums">
                      {linea.cantidad}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {formatearCLP(linea.subtotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <Separator />

            <dl className="space-y-1.5 text-sm">
              <Fila etiqueta="Neto" valor={detalle.neto} />
              <Fila etiqueta="Impuesto (15%)" valor={detalle.impuesto} />
              <Fila etiqueta="Total" valor={detalle.bruto} fuerte />
            </dl>

            {/* Datos del SII (Bonus 2): aparecen cuando el webhook ya respondió. */}
            {detalle.estado_sii === "emitida" &&
            (detalle.sii_codigo || detalle.pdf_url) ? (
              <>
                <Separator />
                <div className="space-y-2 text-sm">
                  {detalle.sii_codigo ? (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Número SII</span>
                      <span className="font-medium tabular-nums">
                        {detalle.sii_codigo}
                      </span>
                    </div>
                  ) : null}
                  {esUrlSegura(detalle.pdf_url) ? (
                    <a
                      href={detalle.pdf_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 font-medium text-emerald-700 hover:underline"
                    >
                      <FileText className="size-4" />
                      Ver PDF
                      <ExternalLink className="size-3" />
                    </a>
                  ) : null}
                </div>
              </>
            ) : detalle.estado_sii === "pendiente" ? (
              <p className="text-xs text-muted-foreground">
                La emisión en el SII está pendiente. Vuelve a abrir o actualiza el
                historial en unos segundos.
              </p>
            ) : null}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Fila({
  etiqueta,
  valor,
  fuerte = false,
}: {
  etiqueta: string;
  valor: number;
  fuerte?: boolean;
}) {
  return (
    <div
      className={
        fuerte
          ? "flex items-center justify-between border-t pt-1.5 text-base font-bold"
          : "flex items-center justify-between text-muted-foreground"
      }
    >
      <dt>{etiqueta}</dt>
      <dd className={fuerte ? "tabular-nums text-emerald-600" : "tabular-nums"}>
        {formatearCLP(valor)}
      </dd>
    </div>
  );
}
