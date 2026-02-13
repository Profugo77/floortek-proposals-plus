import { useState, useMemo, useCallback } from "react";
import Header from "@/components/Header";
import ClienteForm from "@/components/ClienteForm";
import ProductoSearch from "@/components/ProductoSearch";
import ItemsTable from "@/components/ItemsTable";
import TotalesPanel from "@/components/TotalesPanel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PresupuestoItem, Producto, calcularTotales, calcularSubtotalItem } from "@/types/presupuesto";
import { supabase } from "@/integrations/supabase/client";
import { generatePresupuestoPdf } from "@/lib/generatePdf";
import { toast } from "sonner";
import { Plus, FileDown, Save, Package } from "lucide-react";

const Index = () => {
  const [clienteNombre, setClienteNombre] = useState("");
  const [clienteDireccion, setClienteDireccion] = useState("");
  const [clienteTelefono, setClienteTelefono] = useState("");
  const [items, setItems] = useState<PresupuestoItem[]>([]);
  const [saving, setSaving] = useState(false);

  // Manual item fields
  const [manualNombre, setManualNombre] = useState("");
  const [manualPrecio, setManualPrecio] = useState("");
  const [manualTipo, setManualTipo] = useState<"material" | "mano_obra">("material");

  const handleClienteChange = useCallback((field: string, value: string) => {
    if (field === "cliente_nombre") setClienteNombre(value);
    if (field === "cliente_direccion") setClienteDireccion(value);
    if (field === "cliente_telefono") setClienteTelefono(value);
  }, []);

  const addProducto = useCallback((producto: Producto) => {
    const newItem: PresupuestoItem = {
      id: crypto.randomUUID(),
      producto_nombre: producto.nombre,
      producto_imagen: producto.imagen_url,
      tipo: producto.tipo,
      precio_unitario: producto.precio,
      cantidad: 1,
      descuento: 0,
      subtotal: producto.precio,
    };
    setItems((prev) => [...prev, newItem]);
  }, []);

  const addManualItem = useCallback(() => {
    if (!manualNombre || !manualPrecio) {
      toast.error("Completá nombre y precio del producto");
      return;
    }
    const precio = parseFloat(manualPrecio);
    if (isNaN(precio) || precio <= 0) {
      toast.error("El precio debe ser un número válido");
      return;
    }
    const newItem: PresupuestoItem = {
      id: crypto.randomUUID(),
      producto_nombre: manualNombre,
      producto_imagen: null,
      tipo: manualTipo,
      precio_unitario: precio,
      cantidad: 1,
      descuento: 0,
      subtotal: precio,
    };
    setItems((prev) => [...prev, newItem]);
    setManualNombre("");
    setManualPrecio("");
  }, [manualNombre, manualPrecio, manualTipo]);

  const updateItem = useCallback((index: number, field: string, value: string | number) => {
    setItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index], [field]: value };
      item.subtotal = calcularSubtotalItem(item);
      updated[index] = item;
      return updated;
    });
  }, []);

  const removeItem = useCallback((index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const totales = useMemo(() => calcularTotales(items), [items]);

  const guardarYGenerarPdf = async () => {
    if (!clienteNombre.trim()) {
      toast.error("Ingresá el nombre del cliente");
      return;
    }
    if (items.length === 0) {
      toast.error("Agregá al menos un ítem");
      return;
    }

    setSaving(true);
    try {
      // Insert presupuesto (numero is auto-assigned by trigger)
      const { data: presupuesto, error } = await supabase
        .from("presupuestos")
        .insert({
          numero: 0, // will be overwritten by trigger
          cliente_nombre: clienteNombre,
          cliente_direccion: clienteDireccion,
          cliente_telefono: clienteTelefono,
          fecha: new Date().toISOString().split("T")[0],
          subtotal_materiales: totales.subtotal_materiales,
          subtotal_mano_obra: totales.subtotal_mano_obra,
          iva: totales.iva,
          total: totales.total,
        })
        .select()
        .single();

      if (error) throw error;

      // Insert items
      const itemsToInsert = items.map((item) => ({
        presupuesto_id: presupuesto.id,
        producto_nombre: item.producto_nombre,
        producto_imagen: item.producto_imagen,
        tipo: item.tipo,
        precio_unitario: item.precio_unitario,
        cantidad: item.cantidad,
        descuento: item.descuento,
        subtotal: calcularSubtotalItem(item),
      }));

      const { error: itemsError } = await supabase
        .from("presupuesto_items")
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      // Generate PDF
      await generatePresupuestoPdf({
        ...totales,
        id: presupuesto.id,
        numero: presupuesto.numero,
        cliente_nombre: clienteNombre,
        cliente_direccion: clienteDireccion,
        cliente_telefono: clienteTelefono,
        fecha: presupuesto.fecha,
        items,
      });

      toast.success(`Presupuesto FT-${String(presupuesto.numero).padStart(4, "0")} guardado y descargado`);

      // Reset form
      setClienteNombre("");
      setClienteDireccion("");
      setClienteTelefono("");
      setItems([]);
    } catch (err: any) {
      toast.error("Error al guardar: " + (err.message || "Error desconocido"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6 space-y-6 max-w-5xl">
        <ClienteForm
          nombre={clienteNombre}
          direccion={clienteDireccion}
          telefono={clienteTelefono}
          onChange={handleClienteChange}
        />

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Ítems del Presupuesto
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Product search */}
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Buscar en catálogo</Label>
              <ProductoSearch onSelect={addProducto} />
            </div>

            {/* Manual entry */}
            <div className="flex gap-2 items-end flex-wrap">
              <div className="flex-1 min-w-[180px]">
                <Label className="text-xs text-muted-foreground">Producto manual</Label>
                <Input
                  placeholder="Nombre del producto"
                  value={manualNombre}
                  onChange={(e) => setManualNombre(e.target.value)}
                />
              </div>
              <div className="w-28">
                <Label className="text-xs text-muted-foreground">Precio</Label>
                <Input
                  type="number"
                  placeholder="Precio"
                  value={manualPrecio}
                  onChange={(e) => setManualPrecio(e.target.value)}
                />
              </div>
              <div className="w-36">
                <Label className="text-xs text-muted-foreground">Tipo</Label>
                <Select value={manualTipo} onValueChange={(v) => setManualTipo(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="material">Material</SelectItem>
                    <SelectItem value="mano_obra">Mano de Obra</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={addManualItem} variant="outline" className="gap-1">
                <Plus className="h-4 w-4" /> Agregar
              </Button>
            </div>

            {/* Items table */}
            <ItemsTable items={items} onUpdate={updateItem} onRemove={removeItem} />
          </CardContent>
        </Card>

        {/* Totals and actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <TotalesPanel
            subtotalMateriales={totales.subtotal_materiales}
            subtotalManoObra={totales.subtotal_mano_obra}
            iva={totales.iva}
            total={totales.total}
          />
          <div className="flex items-end">
            <Button
              size="lg"
              className="w-full gap-2 text-base h-14"
              onClick={guardarYGenerarPdf}
              disabled={saving}
            >
              {saving ? (
                "Guardando..."
              ) : (
                <>
                  <FileDown className="h-5 w-5" />
                  Generar Presupuesto
                </>
              )}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
