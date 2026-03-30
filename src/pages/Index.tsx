import { useState, useMemo, useCallback, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Textarea } from "@/components/ui/textarea";
import Header from "@/components/Header";
import ClienteForm from "@/components/ClienteForm";
import ProductoSearch from "@/components/ProductoSearch";
import ItemsTable from "@/components/ItemsTable";
import TotalesPanel from "@/components/TotalesPanel";
import AlternativasManager from "@/components/AlternativasManager";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Alternativa, PresupuestoItem, Producto, calcularTotales, calcularSubtotalItem } from "@/types/presupuesto";
import { supabase } from "@/integrations/supabase/client";
import { generatePresupuestoPdf } from "@/lib/generatePdf";
import { toast } from "sonner";
import { Plus, FileDown, Package, Layers } from "lucide-react";
import VoiceDictation from "@/components/VoiceDictation";

interface LocationState {
  editPresupuesto?: {
    id: string;
    numero: number;
    cliente_nombre: string;
    cliente_direccion: string;
    cliente_telefono: string;
    comentarios: string;
    fecha: string;
    items: PresupuestoItem[];
    alternativas: Alternativa[];
  };
}

const Index = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const editData = (location.state as LocationState)?.editPresupuesto;

  const [editId, setEditId] = useState<string | null>(null);
  const [editNumero, setEditNumero] = useState<number | null>(null);
  const [clienteNombre, setClienteNombre] = useState("");
  const [clienteDireccion, setClienteDireccion] = useState("");
  const [clienteTelefono, setClienteTelefono] = useState("");
  const [items, setItems] = useState<PresupuestoItem[]>([]);
  const [comentarios, setComentarios] = useState("");
  const [saving, setSaving] = useState(false);

  // Alternatives
  const [useAlternativas, setUseAlternativas] = useState(false);
  const [alternativas, setAlternativas] = useState<Alternativa[]>([]);
  const [mostrarTotalGeneral, setMostrarTotalGeneral] = useState(false);

  // Manual item fields
  const [manualNombre, setManualNombre] = useState("");
  const [manualPrecio, setManualPrecio] = useState("");
  const [manualTipo, setManualTipo] = useState<"material" | "mano_obra">("material");

  // Load edit data
  useEffect(() => {
    if (editData) {
      setEditId(editData.id);
      setEditNumero(editData.numero);
      setClienteNombre(editData.cliente_nombre);
      setClienteDireccion(editData.cliente_direccion);
      setClienteTelefono(editData.cliente_telefono);
      setComentarios(editData.comentarios || "");
      if (editData.alternativas && editData.alternativas.length > 0) {
        setUseAlternativas(true);
        setAlternativas(editData.alternativas);
        setItems([]);
      } else {
        setItems(editData.items);
        setUseAlternativas(false);
        setAlternativas([]);
      }
      // Clear navigation state so refresh doesn't re-load
      window.history.replaceState({}, document.title);
    }
  }, [editData]);

  const handleClienteChange = useCallback((field: string, value: string) => {
    if (field === "cliente_nombre") setClienteNombre(value);
    if (field === "cliente_direccion") setClienteDireccion(value);
    if (field === "cliente_telefono") setClienteTelefono(value);
  }, []);

  const addProducto = useCallback((producto: Producto) => {
    const itemId = crypto.randomUUID();
    const newItem: PresupuestoItem = {
      id: itemId,
      producto_nombre: producto.nombre,
      producto_imagen: producto.imagen_url,
      tipo: producto.tipo,
      precio_unitario: producto.precio,
      cantidad: 1,
      descuento: 0,
      subtotal: producto.precio,
    };
    setItems((prev) => [...prev, newItem]);

    supabase.functions.invoke("enriquecer-producto", {
      body: { nombre: producto.nombre },
    }).then(({ data }) => {
      if (data?.imagen || data?.descripcion) {
        setItems((prev) =>
          prev.map((item) =>
            item.id === itemId
              ? { ...item, producto_imagen: data.imagen || item.producto_imagen, producto_descripcion: data.descripcion || item.producto_descripcion }
              : item
          )
        );
      }
    }).catch(() => {});
  }, []);

  const handleVoiceResult = useCallback((result: {
    cliente_nombre: string;
    cliente_direccion: string;
    cliente_telefono: string;
    items: Array<{
      producto_nombre: string;
      producto_imagen: string | null;
      producto_descripcion?: string | null;
      tipo: "material" | "mano_obra";
      precio_unitario: number;
      cantidad: number;
      descuento: number;
    }>;
  }) => {
    if (result.cliente_nombre) setClienteNombre(result.cliente_nombre);
    if (result.cliente_direccion) setClienteDireccion(result.cliente_direccion);
    if (result.cliente_telefono) setClienteTelefono(result.cliente_telefono);

    const newItems: PresupuestoItem[] = result.items.map((item) => ({
      id: crypto.randomUUID(),
      producto_nombre: item.producto_nombre,
      producto_imagen: item.producto_imagen,
      producto_descripcion: item.producto_descripcion || null,
      tipo: item.tipo,
      precio_unitario: item.precio_unitario,
      cantidad: item.cantidad,
      descuento: item.descuento,
      subtotal: calcularSubtotalItem(item),
    }));

    setItems((prev) => [...prev, ...newItems]);
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
    const itemId = crypto.randomUUID();
    const newItem: PresupuestoItem = {
      id: itemId,
      producto_nombre: manualNombre,
      producto_imagen: null,
      tipo: manualTipo,
      precio_unitario: precio,
      cantidad: 1,
      descuento: 0,
      subtotal: precio,
    };
    setItems((prev) => [...prev, newItem]);
    const nombreToEnrich = manualNombre;
    setManualNombre("");
    setManualPrecio("");

    if (manualTipo === "material") {
      supabase.functions.invoke("enriquecer-producto", {
        body: { nombre: nombreToEnrich },
      }).then(({ data }) => {
        if (data?.imagen || data?.descripcion) {
          setItems((prev) =>
            prev.map((item) =>
              item.id === itemId
                ? { ...item, producto_imagen: data.imagen || item.producto_imagen, producto_descripcion: data.descripcion || item.producto_descripcion }
                : item
            )
          );
        }
      }).catch(() => {});
    }
  }, [manualNombre, manualPrecio, manualTipo]);

  const updateItem = useCallback((index: number, field: string, value: string | number) => {
    setItems((prev) => {
      const updated = [...prev];
      const parsedValue = field === "mostrar_imagen" ? value === 1 : value;
      const item = { ...updated[index], [field]: parsedValue };
      item.subtotal = calcularSubtotalItem(item);
      updated[index] = item;
      return updated;
    });
  }, []);

  const removeItem = useCallback((index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const totales = useMemo(() => calcularTotales(items), [items]);

  // Toggle alternativas mode
  const toggleAlternativas = useCallback((enabled: boolean) => {
    setUseAlternativas(enabled);
    if (enabled && alternativas.length === 0) {
      // Move current items to first alternativa
      const firstAlt: Alternativa = {
        id: crypto.randomUUID(),
        nombre: "Alternativa 1",
        orden: 0,
        items: [...items],
        ...calcularTotales(items),
      };
      setAlternativas([firstAlt]);
    } else if (!enabled && alternativas.length > 0) {
      // Move first alternativa items back to main
      setItems(alternativas[0].items);
    }
  }, [items, alternativas]);

  const cancelEdit = useCallback(() => {
    setEditId(null);
    setEditNumero(null);
    setClienteNombre("");
    setClienteDireccion("");
    setClienteTelefono("");
    setComentarios("");
    setItems([]);
    setUseAlternativas(false);
    setAlternativas([]);
    setMostrarTotalGeneral(false);
  }, []);

  const guardarYGenerarPdf = async () => {
    if (!clienteNombre.trim()) {
      toast.error("Ingresá el nombre del cliente");
      return;
    }

    const allItems = useAlternativas
      ? alternativas.flatMap((a) => a.items)
      : items;

    if (allItems.length === 0) {
      toast.error("Agregá al menos un ítem");
      return;
    }

    // Calculate grand totals
    const grandTotales = useAlternativas
      ? alternativas.reduce(
          (acc, alt) => ({
            subtotal_materiales: acc.subtotal_materiales + alt.subtotal_materiales,
            subtotal_mano_obra: acc.subtotal_mano_obra + alt.subtotal_mano_obra,
            iva: acc.iva + alt.iva,
            total: acc.total + alt.total,
          }),
          { subtotal_materiales: 0, subtotal_mano_obra: 0, iva: 0, total: 0 }
        )
      : totales;

    setSaving(true);
    try {
      let presupuestoId: string;
      let presupuestoNumero: number;
      let presupuestoFecha: string;

      if (editId) {
        // UPDATE existing
        const { error } = await supabase
          .from("presupuestos")
          .update({
            cliente_nombre: clienteNombre,
            cliente_direccion: clienteDireccion,
            cliente_telefono: clienteTelefono,
            comentarios,
            subtotal_materiales: grandTotales.subtotal_materiales,
            subtotal_mano_obra: grandTotales.subtotal_mano_obra,
            iva: grandTotales.iva,
            total: grandTotales.total,
          })
          .eq("id", editId);

        if (error) throw error;

        presupuestoId = editId;
        presupuestoNumero = editNumero!;
        // Mantener la fecha original del presupuesto
        presupuestoFecha = editData?.fecha || new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" });

        // Delete old items and alternativas
        await supabase.from("presupuesto_items").delete().eq("presupuesto_id", editId);
        await supabase.from("presupuesto_alternativas").delete().eq("presupuesto_id", editId);
      } else {
        // INSERT new
        const { data: presupuesto, error } = await supabase
          .from("presupuestos")
          .insert({
            numero: 0,
            cliente_nombre: clienteNombre,
            cliente_direccion: clienteDireccion,
            cliente_telefono: clienteTelefono,
            comentarios,
            fecha: new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }),
            subtotal_materiales: grandTotales.subtotal_materiales,
            subtotal_mano_obra: grandTotales.subtotal_mano_obra,
            iva: grandTotales.iva,
            total: grandTotales.total,
          })
          .select()
          .single();

        if (error) throw error;
        presupuestoId = presupuesto.id;
        presupuestoNumero = presupuesto.numero;
        presupuestoFecha = presupuesto.fecha;
      }

      if (useAlternativas) {
        // Insert alternativas and their items
        for (const alt of alternativas) {
          const { data: altRow, error: altError } = await supabase
            .from("presupuesto_alternativas")
            .insert({
              presupuesto_id: presupuestoId,
              nombre: alt.nombre,
              orden: alt.orden,
              subtotal_materiales: alt.subtotal_materiales,
              subtotal_mano_obra: alt.subtotal_mano_obra,
              iva: alt.iva,
              total: alt.total,
            })
            .select()
            .single();

          if (altError) throw altError;

          const itemsToInsert = alt.items.map((item) => ({
            presupuesto_id: presupuestoId,
            alternativa_id: altRow.id,
            producto_nombre: item.producto_nombre,
            producto_imagen: item.producto_imagen,
            tipo: item.tipo,
            precio_unitario: item.precio_unitario,
            cantidad: item.cantidad,
            descuento: item.descuento,
            subtotal: calcularSubtotalItem(item),
          }));

          if (itemsToInsert.length > 0) {
            const { error: itemsError } = await supabase.from("presupuesto_items").insert(itemsToInsert);
            if (itemsError) throw itemsError;
          }
        }
      } else {
        // Insert items without alternativa
        const itemsToInsert = items.map((item) => ({
          presupuesto_id: presupuestoId,
          producto_nombre: item.producto_nombre,
          producto_imagen: item.producto_imagen,
          tipo: item.tipo,
          precio_unitario: item.precio_unitario,
          cantidad: item.cantidad,
          descuento: item.descuento,
          subtotal: calcularSubtotalItem(item),
        }));

        const { error: itemsError } = await supabase.from("presupuesto_items").insert(itemsToInsert);
        if (itemsError) throw itemsError;
      }

      // Generate PDF
      await generatePresupuestoPdf({
        ...grandTotales,
        id: presupuestoId,
        numero: presupuestoNumero,
        cliente_nombre: clienteNombre,
        cliente_direccion: clienteDireccion,
        cliente_telefono: clienteTelefono,
        comentarios,
        fecha: presupuestoFecha,
        items: useAlternativas ? [] : items,
        alternativas: useAlternativas ? alternativas : undefined,
        mostrarTotalGeneral: useAlternativas && mostrarTotalGeneral && alternativas.length > 1,
      });

      const label = editId ? "actualizado" : "guardado";
      toast.success(`Presupuesto FT-${String(presupuestoNumero).padStart(4, "0")} ${label} y descargado`);

      // Reset form
      cancelEdit();
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
        {/* Edit mode banner */}
        {editId && (
          <Card className="border-primary bg-primary/5">
            <CardContent className="py-3 flex items-center justify-between">
              <span className="text-sm font-medium">
                ✏️ Editando presupuesto <span className="font-mono font-bold text-primary">FT-{String(editNumero).padStart(4, "0")}</span>
              </span>
              <Button variant="ghost" size="sm" onClick={cancelEdit}>
                Cancelar edición
              </Button>
            </CardContent>
          </Card>
        )}

        <ClienteForm
          nombre={clienteNombre}
          direccion={clienteDireccion}
          telefono={clienteTelefono}
          onChange={handleClienteChange}
        />

        {/* Alternativas toggle */}
        <Card>
          <CardContent className="py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              <Label htmlFor="use-alternativas" className="text-sm font-medium cursor-pointer">
                Usar alternativas
              </Label>
              <span className="text-xs text-muted-foreground">(para ofrecer distintas opciones al cliente)</span>
            </div>
            <Switch
              id="use-alternativas"
              checked={useAlternativas}
              onCheckedChange={toggleAlternativas}
            />
          </CardContent>
        </Card>

        {useAlternativas ? (
          <>
            <AlternativasManager alternativas={alternativas} onChange={setAlternativas} />
            {alternativas.length > 1 && (
              <Card>
                <CardContent className="py-3 flex items-center gap-3">
                  <Checkbox
                    id="total-general"
                    checked={mostrarTotalGeneral}
                    onCheckedChange={(v) => setMostrarTotalGeneral(!!v)}
                  />
                  <Label htmlFor="total-general" className="text-sm font-medium cursor-pointer">
                    Incluir Total General
                  </Label>
                  <span className="text-xs text-muted-foreground">
                    — aparece al final del presupuesto y el PDF
                  </span>
                </CardContent>
              </Card>
            )}
            {useAlternativas && mostrarTotalGeneral && alternativas.length > 1 && (() => {
              const grand = alternativas.reduce(
                (acc, a) => ({
                  subtotal_materiales: acc.subtotal_materiales + a.subtotal_materiales,
                  subtotal_mano_obra: acc.subtotal_mano_obra + a.subtotal_mano_obra,
                  iva: acc.iva + a.iva,
                  total: acc.total + a.total,
                }),
                { subtotal_materiales: 0, subtotal_mano_obra: 0, iva: 0, total: 0 }
              );
              return (
                <Card className="border-2 border-primary">
                  <CardHeader className="pb-2 pt-3">
                    <CardTitle className="text-sm font-bold text-primary uppercase tracking-wide">
                      Total General
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-3">
                    <TotalesPanel
                      subtotalMateriales={grand.subtotal_materiales}
                      subtotalManoObra={grand.subtotal_mano_obra}
                      iva={grand.iva}
                      total={grand.total}
                    />
                  </CardContent>
                </Card>
              );
            })()}
          </>
        ) : (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                Ítems del Presupuesto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Buscar en catálogo</Label>
                <ProductoSearch onSelect={addProducto} />
              </div>

              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Dictar presupuesto completo por voz</Label>
                <VoiceDictation onResult={handleVoiceResult} />
              </div>

              <div className="flex gap-2 items-end flex-wrap">
                <div className="flex-1 min-w-[180px]">
                  <Label className="text-xs text-muted-foreground">Producto manual</Label>
                  <Input placeholder="Nombre del producto" value={manualNombre} onChange={(e) => setManualNombre(e.target.value)} />
                </div>
                <div className="w-28">
                  <Label className="text-xs text-muted-foreground">Precio</Label>
                  <Input type="number" placeholder="Precio" value={manualPrecio} onChange={(e) => setManualPrecio(e.target.value)} />
                </div>
                <div className="w-36">
                  <Label className="text-xs text-muted-foreground">Tipo</Label>
                  <Select value={manualTipo} onValueChange={(v) => setManualTipo(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
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

              <ItemsTable items={items} onUpdate={updateItem} onRemove={removeItem} />
            </CardContent>
          </Card>
        )}

        {/* Comments */}
        <Card>
          <CardContent className="pt-4">
            <Label className="text-sm font-medium mb-2 block">Comentarios / Observaciones</Label>
            <Textarea
              placeholder="Notas generales del presupuesto..."
              value={comentarios}
              onChange={(e) => setComentarios(e.target.value)}
              rows={3}
            />
          </CardContent>
        </Card>

        {/* Totals and actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {!useAlternativas && (
            <TotalesPanel
              subtotalMateriales={totales.subtotal_materiales}
              subtotalManoObra={totales.subtotal_mano_obra}
              iva={totales.iva}
              total={totales.total}
            />
          )}
          <div className={`flex items-end ${useAlternativas ? "md:col-span-2" : ""}`}>
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
                  {editId ? "Actualizar Presupuesto" : "Generar Presupuesto"}
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
