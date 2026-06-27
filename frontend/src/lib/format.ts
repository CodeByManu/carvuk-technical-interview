// Formato de moneda chilena: pesos sin decimales, p. ej. "$2.000".
const clp = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

export function formatearCLP(monto: number): string {
  return clp.format(monto);
}

// Fecha legible en formato chileno, p. ej. "27-06-2026, 17:30".
const fecha = new Intl.DateTimeFormat("es-CL", {
  dateStyle: "short",
  timeStyle: "short",
});

export function formatearFecha(iso: string): string {
  return fecha.format(new Date(iso));
}
