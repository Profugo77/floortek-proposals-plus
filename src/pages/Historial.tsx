import { useState, useEffect } from "react";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { generatePresupuestoPdf } from "@/lib/generatePdf";
import { toast } from "sonner";
import { Search, FileDown, History } from "lucide-react";

interface PresupuestoRow {
  id: string;
  numero: number;
  cliente_nombre: string;
  cliente_direccion: string;
  cliente_telefono: string;
  fecha: string;
  subtotal_materiales: number;
  subtotal_mano_obra: number;
  iva: number;
  total: number;
  created_at: string;
}

const fmt = (n: number) => `$${n.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`;

const Historial = () => {
  const [presupuestos, setPresupuestos] = useState<PresupuestoRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPresupuestos();
  }, []);

  const loadPresupuestos = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("presupuestos")
      .select("*")
      .order("numero", { ascending: false });

    if (data) setPresupuestos(data);
    if (error) toast.error("Error al cargar historial");
    setLoading(false);
  };

  const regenerarPdf = async (p: PresupuestoRow) => {
    const { data: items } = await supabase
      .from("presupuesto_items")
      .select("*")
      .eq("presupuesto_id", p.id);

    if (!items) {
      toast.error("No se pudieron cargar los ítems");
      return;
    }

    await generatePresupuestoPdf({
      ...p,
      items: items.map((i) => ({
        id: i.id,
        producto_nombre: i.producto_nombre,
        producto_imagen: i.producto_imagen,
        tipo: i.tipo as "material" | "mano_obra",
        precio_unitario: i.precio_unitario,
        cantidad: i.cantidad,
        descuento: i.descuento,
        subtotal: i.subtotal,
      })),
    });

    toast.success("PDF regenerado");
  };

  const filtered = presupuestos.filter(
    (p) =>
      p.cliente_nombre.toLowerCase().includes(search.toLowerCase()) ||
      `FT-${String(p.numero).padStart(4, "0")}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6 max-w-5xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Historial de Presupuestos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente o número..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Cargando...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay presupuestos guardados
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-primary text-primary-foreground">
                      <th className="px-3 py-2 text-left rounded-tl-md">N°</th>
                      <th className="px-3 py-2 text-left">Fecha</th>
                      <th className="px-3 py-2 text-left">Cliente</th>
                      <th className="px-3 py-2 text-right">Total</th>
                      <th className="px-3 py-2 text-center rounded-tr-md">PDF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p) => (
                      <tr key={p.id} className="border-b hover:bg-muted/50 transition-colors">
                        <td className="px-3 py-3 font-mono font-semibold text-primary">
                          FT-{String(p.numero).padStart(4, "0")}
                        </td>
                        <td className="px-3 py-3">
                          {new Date(p.fecha).toLocaleDateString("es-AR")}
                        </td>
                        <td className="px-3 py-3">{p.cliente_nombre}</td>
                        <td className="px-3 py-3 text-right font-semibold">{fmt(p.total)}</td>
                        <td className="px-3 py-3 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => regenerarPdf(p)}
                            className="gap-1 text-primary"
                          >
                            <FileDown className="h-4 w-4" />
                            PDF
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Historial;
