
-- Drop all existing permissive policies on presupuestos
DROP POLICY IF EXISTS "Presupuestos públicos lectura" ON public.presupuestos;
DROP POLICY IF EXISTS "Presupuestos públicos insertar" ON public.presupuestos;
DROP POLICY IF EXISTS "Presupuestos públicos actualizar" ON public.presupuestos;
DROP POLICY IF EXISTS "Presupuestos públicos eliminar" ON public.presupuestos;

-- Drop all existing permissive policies on presupuesto_items
DROP POLICY IF EXISTS "Items públicos lectura" ON public.presupuesto_items;
DROP POLICY IF EXISTS "Items públicos insertar" ON public.presupuesto_items;
DROP POLICY IF EXISTS "Items públicos actualizar" ON public.presupuesto_items;
DROP POLICY IF EXISTS "Items públicos eliminar" ON public.presupuesto_items;

-- Drop all existing permissive policies on productos
DROP POLICY IF EXISTS "Productos públicos lectura" ON public.productos;
DROP POLICY IF EXISTS "Productos públicos insertar" ON public.productos;
DROP POLICY IF EXISTS "Productos públicos actualizar" ON public.productos;
DROP POLICY IF EXISTS "Productos públicos eliminar" ON public.productos;

-- presupuestos: only authenticated users
CREATE POLICY "Authenticated users can read presupuestos"
  ON public.presupuestos FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert presupuestos"
  ON public.presupuestos FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update presupuestos"
  ON public.presupuestos FOR UPDATE TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete presupuestos"
  ON public.presupuestos FOR DELETE TO authenticated
  USING (true);

-- presupuesto_items: only authenticated users
CREATE POLICY "Authenticated users can read items"
  ON public.presupuesto_items FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert items"
  ON public.presupuesto_items FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update items"
  ON public.presupuesto_items FOR UPDATE TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete items"
  ON public.presupuesto_items FOR DELETE TO authenticated
  USING (true);

-- productos: read for everyone (catalog), write for authenticated
CREATE POLICY "Anyone can read productos"
  ON public.productos FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert productos"
  ON public.productos FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update productos"
  ON public.productos FOR UPDATE TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete productos"
  ON public.productos FOR DELETE TO authenticated
  USING (true);
