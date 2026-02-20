export interface Producto {
  id: string;
  nombre: string;
  categoria: string;
  precio: number;
  tipo: 'material' | 'mano_obra';
  imagen_url: string | null;
}

export interface PresupuestoItem {
  id: string;
  producto_nombre: string;
  producto_imagen: string | null;
  producto_descripcion?: string | null;
  tipo: 'material' | 'mano_obra';
  precio_unitario: number;
  cantidad: number;
  descuento: number;
  subtotal: number;
}

export interface Alternativa {
  id: string;
  nombre: string;
  orden: number;
  items: PresupuestoItem[];
  subtotal_materiales: number;
  subtotal_mano_obra: number;
  iva: number;
  total: number;
}

export interface Presupuesto {
  id?: string;
  numero?: number;
  cliente_nombre: string;
  cliente_direccion: string;
  cliente_telefono: string;
  fecha: string;
  items: PresupuestoItem[];
  alternativas?: Alternativa[];
  comentarios?: string;
  subtotal_materiales: number;
  subtotal_mano_obra: number;
  iva: number;
  total: number;
  mostrarTotalGeneral?: boolean;
}

export function calcularTotales(items: PresupuestoItem[]) {
  let netoMateriales = 0;
  let netoManoObra = 0;

  items.forEach(item => {
    const subtotalConDesc = item.precio_unitario * item.cantidad * (1 - item.descuento / 100);
    if (item.tipo === 'material') {
      // Precio YA incluye 21% IVA → neto = precio / 1.21
      netoMateriales += subtotalConDesc / 1.21;
    } else {
      // Mano de obra NO incluye IVA
      netoManoObra += subtotalConDesc;
    }
  });

  const ivaMateriales = netoMateriales * 0.21;
  const ivaManoObra = netoManoObra * 0.21;
  const ivaTotal = ivaMateriales + ivaManoObra;
  const total = netoMateriales + netoManoObra + ivaTotal;

  return {
    subtotal_materiales: Math.round(netoMateriales * 100) / 100,
    subtotal_mano_obra: Math.round(netoManoObra * 100) / 100,
    iva: Math.round(ivaTotal * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
}

export function calcularSubtotalItem(item: Pick<PresupuestoItem, 'precio_unitario' | 'cantidad' | 'descuento'>) {
  return Math.round(item.precio_unitario * item.cantidad * (1 - item.descuento / 100) * 100) / 100;
}
