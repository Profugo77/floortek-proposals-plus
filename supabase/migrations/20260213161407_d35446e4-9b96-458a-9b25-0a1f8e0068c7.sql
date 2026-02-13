
-- Tabla de productos (catálogo)
CREATE TABLE public.productos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'General',
  precio NUMERIC(12,2) NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'material' CHECK (tipo IN ('material', 'mano_obra')),
  imagen_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Productos públicos lectura" ON public.productos FOR SELECT USING (true);
CREATE POLICY "Productos públicos insertar" ON public.productos FOR INSERT WITH CHECK (true);
CREATE POLICY "Productos públicos actualizar" ON public.productos FOR UPDATE USING (true);
CREATE POLICY "Productos públicos eliminar" ON public.productos FOR DELETE USING (true);

-- Tabla de presupuestos
CREATE TABLE public.presupuestos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero INTEGER NOT NULL,
  cliente_nombre TEXT NOT NULL DEFAULT '',
  cliente_direccion TEXT NOT NULL DEFAULT '',
  cliente_telefono TEXT NOT NULL DEFAULT '',
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  subtotal_materiales NUMERIC(12,2) NOT NULL DEFAULT 0,
  subtotal_mano_obra NUMERIC(12,2) NOT NULL DEFAULT 0,
  iva NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.presupuestos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Presupuestos públicos lectura" ON public.presupuestos FOR SELECT USING (true);
CREATE POLICY "Presupuestos públicos insertar" ON public.presupuestos FOR INSERT WITH CHECK (true);
CREATE POLICY "Presupuestos públicos actualizar" ON public.presupuestos FOR UPDATE USING (true);
CREATE POLICY "Presupuestos públicos eliminar" ON public.presupuestos FOR DELETE USING (true);

-- Tabla de ítems del presupuesto
CREATE TABLE public.presupuesto_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  presupuesto_id UUID NOT NULL REFERENCES public.presupuestos(id) ON DELETE CASCADE,
  producto_nombre TEXT NOT NULL,
  producto_imagen TEXT,
  tipo TEXT NOT NULL DEFAULT 'material' CHECK (tipo IN ('material', 'mano_obra')),
  precio_unitario NUMERIC(12,2) NOT NULL,
  cantidad NUMERIC(12,2) NOT NULL DEFAULT 1,
  descuento NUMERIC(5,2) NOT NULL DEFAULT 0,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.presupuesto_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Items públicos lectura" ON public.presupuesto_items FOR SELECT USING (true);
CREATE POLICY "Items públicos insertar" ON public.presupuesto_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Items públicos actualizar" ON public.presupuesto_items FOR UPDATE USING (true);
CREATE POLICY "Items públicos eliminar" ON public.presupuesto_items FOR DELETE USING (true);

-- Función para número correlativo
CREATE OR REPLACE FUNCTION public.get_next_presupuesto_numero()
RETURNS INTEGER AS $$
  SELECT COALESCE(MAX(numero), 0) + 1 FROM public.presupuestos;
$$ LANGUAGE sql SET search_path = public;

-- Trigger para asignar número correlativo automáticamente
CREATE OR REPLACE FUNCTION public.set_presupuesto_numero()
RETURNS TRIGGER AS $$
BEGIN
  NEW.numero := public.get_next_presupuesto_numero();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_set_presupuesto_numero
BEFORE INSERT ON public.presupuestos
FOR EACH ROW
EXECUTE FUNCTION public.set_presupuesto_numero();

-- Insertar productos de ejemplo
INSERT INTO public.productos (nombre, categoria, precio, tipo, imagen_url) VALUES
('Piso Laminado Roble Tivoli', 'Pisos Laminados', 8500.00, 'material', 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=200'),
('Piso Laminado Roble Natural', 'Pisos Laminados', 7800.00, 'material', 'https://images.unsplash.com/photo-1622452225456-e2e4e8e0a054?w=200'),
('Piso Laminado Nogal Americano', 'Pisos Laminados', 9200.00, 'material', 'https://images.unsplash.com/photo-1615873968403-89e068629265?w=200'),
('Porcelanato Calacatta 60x120', 'Porcelanatos', 12500.00, 'material', 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=200'),
('Porcelanato Simil Madera 20x120', 'Porcelanatos', 9800.00, 'material', 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=200'),
('Porcelanato Cemento Gris 60x60', 'Porcelanatos', 8900.00, 'material', 'https://images.unsplash.com/photo-1600607687644-c7171b42498f?w=200'),
('Zócalo Top Line Blanco 10cm', 'Zócalos', 2800.00, 'material', 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=200'),
('Zócalo MDF Roble 7cm', 'Zócalos', 2200.00, 'material', 'https://images.unsplash.com/photo-1562663474-6cbb3eaa4d14?w=200'),
('Adhesivo Weber Flex 30kg', 'Adhesivos', 4500.00, 'material', 'https://images.unsplash.com/photo-1581783898382-80983a9e4903?w=200'),
('Pastina Prestige Color 5kg', 'Adhesivos', 3200.00, 'material', 'https://images.unsplash.com/photo-1595814433015-e6f5ce69614e?w=200'),
('Membrana Asfáltica 4mm x 10m', 'Aislantes', 15000.00, 'material', 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=200'),
('Espuma Niveladora 2mm x 20m²', 'Aislantes', 3500.00, 'material', 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=200'),
('Colocación Piso Laminado (m²)', 'Mano de Obra', 3500.00, 'mano_obra', NULL),
('Colocación Porcelanato (m²)', 'Mano de Obra', 5000.00, 'mano_obra', NULL),
('Colocación Zócalos (ml)', 'Mano de Obra', 1500.00, 'mano_obra', NULL),
('Nivelación de Piso (m²)', 'Mano de Obra', 4000.00, 'mano_obra', NULL),
('Retiro de Piso Existente (m²)', 'Mano de Obra', 2500.00, 'mano_obra', NULL);
