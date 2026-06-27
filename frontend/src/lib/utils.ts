import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Combina clases de Tailwind resolviendo conflictos (la última gana).
// Es el helper estándar que usan todos los componentes de shadcn/ui.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Quita acentos/diacríticos y pasa a minúsculas, para comparaciones de texto
// tolerantes (p. ej. "azucar" matchea "Azúcar").
export function normalizarTexto(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}
