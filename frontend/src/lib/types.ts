// Tipos del dominio, espejo de los schemas de salida del backend (core/schemas.py).

export interface Producto {
  id: number;
  nombre: string;
  precio: number;
}

export interface LineaBoleta {
  nombre: string;
  precio_unitario: number;
  cantidad: number;
  subtotal: number;
}

// Estado de la emisión contra el SII (Bonus 2).
export type EstadoSii = "pendiente" | "emitida" | "error";

export interface BoletaResumen {
  id: number;
  creada_en: string;
  bruto: number;
  impuesto: number;
  neto: number;
  cantidad_items: number;
  estado_sii: EstadoSii;
  sii_codigo: string;
  pdf_url: string;
}

export interface BoletaDetalle {
  id: number;
  creada_en: string;
  bruto: number;
  impuesto: number;
  neto: number;
  estado_sii: EstadoSii;
  sii_codigo: string;
  pdf_url: string;
  lineas: LineaBoleta[];
}

// Lo que el front envía al crear una boleta (solo id y cantidad; el precio lo
// pone el backend desde la DB).
export interface ItemCarritoIn {
  producto_id: number;
  cantidad: number;
}
