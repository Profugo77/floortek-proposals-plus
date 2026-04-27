ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS unidad text;
ALTER TABLE public.presupuesto_items ADD COLUMN IF NOT EXISTS unidad text;