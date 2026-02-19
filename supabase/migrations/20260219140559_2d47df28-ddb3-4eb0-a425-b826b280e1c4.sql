
-- Table for budget alternatives
CREATE TABLE public.presupuesto_alternativas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  presupuesto_id UUID NOT NULL REFERENCES public.presupuestos(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL DEFAULT 'Alternativa 1',
  orden INTEGER NOT NULL DEFAULT 0,
  subtotal_materiales NUMERIC NOT NULL DEFAULT 0,
  subtotal_mano_obra NUMERIC NOT NULL DEFAULT 0,
  iva NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add alternativa_id to items (nullable for backward compat)
ALTER TABLE public.presupuesto_items 
ADD COLUMN alternativa_id UUID REFERENCES public.presupuesto_alternativas(id) ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE public.presupuesto_alternativas ENABLE ROW LEVEL SECURITY;

-- RLS policies (same pattern as other tables)
CREATE POLICY "Authenticated users can read alternativas"
ON public.presupuesto_alternativas FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert alternativas"
ON public.presupuesto_alternativas FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can update alternativas"
ON public.presupuesto_alternativas FOR UPDATE USING (true);

CREATE POLICY "Authenticated users can delete alternativas"
ON public.presupuesto_alternativas FOR DELETE USING (true);
