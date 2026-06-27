// Cliente de la API. Cada request adjunta el JWT de Clerk como Bearer; el backend
// verifica ese token y deriva la identidad de sus claims (modelo stateless).
import { useAuth } from "@clerk/clerk-react";
import { useCallback, useMemo } from "react";

import type {
  BoletaDetalle,
  BoletaResumen,
  ItemCarritoIn,
  Producto,
} from "@/lib/types";

const BASE = import.meta.env.VITE_API_URL;

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

export function useApi() {
  const { getToken } = useAuth();

  const request = useCallback(
    async <T>(path: string, options: RequestInit = {}): Promise<T> => {
      const token = await getToken();
      const resp = await fetch(`${BASE}${path}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...options.headers,
        },
      });

      if (!resp.ok) {
        // django-ninja devuelve {detail: "..."} en sus errores; lo usamos si está.
        let detalle = `Error ${resp.status}`;
        try {
          const body = await resp.json();
          if (body?.detail) detalle = body.detail;
        } catch {
          // respuesta sin cuerpo JSON; queda el mensaje genérico
        }
        throw new ApiError(resp.status, detalle);
      }

      if (resp.status === 204) return undefined as T;
      return (await resp.json()) as T;
    },
    [getToken],
  );

  // Métodos memoizados: identidad estable para usarlos como dependencia de efectos.
  return useMemo(
    () => ({
      listarProductos: () => request<Producto[]>("/productos"),
      listarBoletas: () => request<BoletaResumen[]>("/boletas"),
      detalleBoleta: (id: number) => request<BoletaDetalle>(`/boletas/${id}`),
      crearBoleta: (items: ItemCarritoIn[]) =>
        request<BoletaDetalle>("/boletas", {
          method: "POST",
          body: JSON.stringify({ items }),
        }),
    }),
    [request],
  );
}
