import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { generatePresupuestoPdf } from "@/lib/generatePdf";
import { generateListaObraPdf } from "@/lib/generateListaObra";
import { PresupuestoItem, Alternativa, calcularTotales } from "@/types/presupuesto";
import { inferirUnidad, Unidad } from "@/lib/unidades";
import UnidadesFaltantesDialog, {
  MaterialFaltante,
} from "@/components/UnidadesFaltantesDialog";
import { toast } from "sonner";
import { Search, FileDown, History, Pencil, ClipboardList } from "lucide-react";

interface PresupuestoRow {
  id: string;
  numero: number;
  cliente_nombre: string;
  cliente_direccion: string;
  cliente_telefono: string;
  fecha: string;
  comentarios: string;
  subtotal_materiales: number;
  subtotal_mano_obra: number;
  iva: number;
  total: number;
  created_at: string;
}

const fmt = (n: number) => `$${n.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`;

const Historial = () => {
  const navigate = useNavigate();
  const [presupuestos, setPresupuestos] = useState<PresupuestoRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Estado del modal de unidades faltantes
  const [pendingObra, setPendingObra] = useState<{
    presupuesto: PresupuestoRow;
    items: PresupuestoItem[];
    unidadesConocidas: Record<string, string>;
    faltantes: MaterialFaltante[];
  } | null>(null);

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

  const loadFullPresupuesto = async (p: PresupuestoRow) => {
    // Load alternativas
    const { data: altsData } = await supabase
      .from("presupuesto_alternativas")
      .select("*")
      .eq("presupuesto_id", p.id)
      .order("orden");

    // Load all items
    const { data: itemsData } = await supabase
      .from("presupuesto_items")
      .select("*")
      .eq("presupuesto_id", p.id);

    if (!itemsData) {
      toast.error("No se pudieron cargar los ítems");
      return null;
    }

    const mapItem = (i: any): PresupuestoItem => ({
      id: i.id,
      producto_nombre: i.producto_nombre,
      producto_imagen: i.producto_imagen,
      tipo: i.tipo as "material" | "mano_obra",
      precio_unitario: i.precio_unitario,
      cantidad: i.cantidad,
      descuento: i.descuento,
      subtotal: i.subtotal,
    });

    if (altsData && altsData.length > 0) {
      const alternativas: Alternativa[] = altsData.map((alt) => {
        const altItems = itemsData
          .filter((i) => i.alternativa_id === alt.id)
          .map(mapItem);
        const totales = calcularTotales(altItems);
        return {
          id: alt.id,
          nombre: alt.nombre,
          orden: alt.orden,
          items: altItems,
          ...totales,
        };
      });
      return { items: [], alternativas };
    } else {
      return { items: itemsData.map(mapItem), alternativas: [] };
    }
  };

  const editarPresupuesto = async (p: PresupuestoRow) => {
    const result = await loadFullPresupuesto(p);
    if (!result) return;

    navigate("/", {
      state: {
        editPresupuesto: {
          id: p.id,
          numero: p.numero,
          cliente_nombre: p.cliente_nombre,
          cliente_direccion: p.cliente_direccion,
          cliente_telefono: p.cliente_telefono,
          comentarios: p.comentarios,
          fecha: p.fecha,
          ...result,
        },
      },
    });
  };

  const regenerarPdf = async (p: PresupuestoRow) => {
    const result = await loadFullPresupuesto(p);
    if (!result) return;

    await generatePresupuestoPdf({
      ...p,
      items: result.items,
      alternativas: result.alternativas.length > 0 ? result.alternativas : undefined,
    });

    toast.success("PDF regenerado");
  };

  const generarListaObra = async (p: PresupuestoRow) => {
    const result = await loadFullPresupuesto(p);
    if (!result) return;

    // Si hay alternativas, juntar todos los items de todas
    const allItems =
      result.alternativas.length > 0
        ? result.alternativas.flatMap((a) => a.items)
        : result.items;

    const materiales = allItems.filter((i) => i.tipo === "material");
    if (materiales.length === 0) {
      toast.error("Este presupuesto no tiene materiales");
      return;
    }

    try {
      generateListaObraPdf({
        numero: p.numero,
        cliente_nombre: p.cliente_nombre,
        cliente_direccion: p.cliente_direccion,
        fecha: p.fecha,
        items: allItems,
      });
      toast.success("Lista de obra generada");
    } catch (e: any) {
      toast.error(e.message || "Error al generar lista");
    }
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
                      <th className="px-3 py-2 text-center rounded-tr-md">Acciones</th>
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
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => editarPresupuesto(p)}
                              className="gap-1 text-primary"
                            >
                              <Pencil className="h-4 w-4" />
                              Editar
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => regenerarPdf(p)}
                              className="gap-1 text-primary"
                            >
                              <FileDown className="h-4 w-4" />
                              PDF
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => generarListaObra(p)}
                              className="gap-1 text-primary"
                              title="Lista de obra: checklist + hojas A4 por material"
                            >
                              <ClipboardList className="h-4 w-4" />
                              Obra
                            </Button>
                          </div>
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
