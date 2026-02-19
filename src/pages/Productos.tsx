import { useState, useEffect } from "react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Trash2, Package, Search } from "lucide-react";

interface ProductoRow {
  nombre: string;
  precio: number;
  categoria: string;
}

function parseCSV(text: string): ProductoRow[] {
  const lines = text.split("\n").filter((l) => l.trim());
  if (lines.length < 3) return [];

  const productos: ProductoRow[] = [];

  for (let i = 2; i < lines.length; i++) {
    // Handle CSV with commas inside quotes
    const cols: string[] = [];
    let current = "";
    let inQuotes = false;
    for (const ch of lines[i]) {
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        cols.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    cols.push(current.trim());

    const nombre = cols[1]?.trim();
    const precioPesos = parseFloat(cols[3]?.replace(/\./g, "").replace(",", ".") || "0");

    if (nombre && precioPesos > 0) {
      // Categorize based on name
      let categoria = "General";
      const lower = nombre.toLowerCase();
      if (lower.includes("revestimiento") || lower.includes("decopanel")) categoria = "Revestimientos";
      else if (lower.includes("zócalo") || lower.includes("zocalo")) categoria = "Zócalos";
      else if (lower.includes("perfil")) categoria = "Perfiles";
      else if (lower.includes("adhesivo") || lower.includes("pegamento")) categoria = "Adhesivos";
      else if (lower.includes("piso flotante") || lower.includes("melamínico") || lower.includes("melaminico")) categoria = "Pisos Flotantes";
      else if (lower.includes("spc") || lower.includes("vinílico") || lower.includes("vinilico") || lower.includes("click")) categoria = "Pisos SPC/Vinílicos";
      else categoria = "Pisos SPC/Vinílicos";

      productos.push({ nombre, precio: precioPesos, categoria });
    }
  }

  return productos;
}

const Productos = () => {
  const [productos, setProductos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchProductos = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("productos")
      .select("*")
      .order("nombre");
    setProductos(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchProductos();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const text = await file.text();
      const parsed = parseCSV(text);

      if (parsed.length === 0) {
        toast.error("No se encontraron productos válidos en el archivo");
        return;
      }

      // Delete existing products and insert new ones
      await supabase.from("productos").delete().neq("id", "00000000-0000-0000-0000-000000000000");

      const rows = parsed.map((p) => ({
        nombre: p.nombre,
        precio: p.precio,
        categoria: p.categoria,
        tipo: "material" as const,
      }));

      // Insert in batches of 50
      for (let i = 0; i < rows.length; i += 50) {
        const batch = rows.slice(i, i + 50);
        const { error } = await supabase.from("productos").insert(batch);
        if (error) throw error;
      }

      toast.success(`${parsed.length} productos importados correctamente`);
      fetchProductos();
    } catch (err: any) {
      toast.error("Error al importar: " + (err.message || "Error desconocido"));
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  const deleteAll = async () => {
    if (!confirm("¿Estás seguro de eliminar todos los productos?")) return;
    await supabase.from("productos").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    toast.success("Productos eliminados");
    fetchProductos();
  };

  const filtered = productos.filter((p) =>
    p.nombre.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6 space-y-6 max-w-5xl">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Lista de Precios
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2 items-end flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <Label className="text-xs text-muted-foreground">Importar CSV (formato: ,Nombre,USD,Pesos)</Label>
                <Input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  disabled={importing}
                />
              </div>
              <Button variant="destructive" size="sm" onClick={deleteAll} className="gap-1">
                <Trash2 className="h-4 w-4" /> Limpiar todo
              </Button>
            </div>

            {importing && <p className="text-sm text-muted-foreground">Importando productos...</p>}

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar producto..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="text-sm text-muted-foreground">
              {productos.length} productos cargados
            </div>

            <div className="max-h-[500px] overflow-auto border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead className="text-right">Precio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                        Cargando...
                      </TableCell>
                    </TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                        No hay productos. Importá un CSV para empezar.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.nombre}</TableCell>
                        <TableCell className="text-muted-foreground">{p.categoria}</TableCell>
                        <TableCell className="text-right font-semibold">
                          ${p.precio.toLocaleString("es-AR")}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Productos;
