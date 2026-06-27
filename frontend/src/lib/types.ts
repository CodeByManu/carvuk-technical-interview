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

export interface BoletaResumen {
  id: number;
  creada_en: string;
  bruto: number;
  impuesto: number;
  neto: number;
  cantidad_items: number;
}

export interface BoletaDetalle {
  id: number;
  creada_en: string;
  bruto: number;
  impuesto: number;
  neto: number;
  lineas: LineaBoleta[];
}

// Lo que el front envía al crear una boleta (solo id y cantidad; el precio lo
// pone el backend desde la DB).
export interface ItemCarritoIn {
  producto_id: number;
  cantidad: number;
}
