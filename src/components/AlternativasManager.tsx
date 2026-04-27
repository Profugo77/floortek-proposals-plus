import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alternativa, PresupuestoItem, Producto, calcularTotales, calcularSubtotalItem } from "@/types/presupuesto";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Copy, Layers } from "lucide-react";
import ProductoSearch from "@/components/ProductoSearch";
import ItemsTable from "@/components/ItemsTable";
import TotalesPanel from "@/components/TotalesPanel";

interface Props {
  alternativas: Alternativa[];
  onChange: React.Dispatch<React.SetStateAction<Alternativa[]>>;
}

const AlternativasManager = ({ alternativas, onChange }: Props) => {
  const [activeTab, setActiveTab] = useState(alternativas[0]?.id || "");
  const [manualNombre, setManualNombre] = useState("");
  const [manualPrecio, setManualPrecio] = useState("");
  const [manualTipo, setManualTipo] = useState<"material" | "mano_obra">("material");

  const addAlternativa = useCallback(() => {
    const newAlt: Alternativa = {
      id: crypto.randomUUID(),
      nombre: `Alternativa ${alternativas.length + 1}`,
      orden: alternativas.length,
      items: [],
      subtotal_materiales: 0,
      subtotal_mano_obra: 0,
      iva: 0,
      total: 0,
    };
    onChange((prev) => [...prev, newAlt]);
    setActiveTab(newAlt.id);
  }, [alternativas.length, onChange]);

  const removeAlternativa = useCallback((id: string) => {
    onChange((prev) => {
      if (prev.length <= 1) {
        toast.error("Debe haber al menos una alternativa");
        return prev;
      }
      const updated = prev.filter((a) => a.id !== id);
      return updated;
    });
    setActiveTab((prevTab) => {
      if (prevTab === id) {
        const remaining = alternativas.filter((a) => a.id !== id);
        return remaining[0]?.id || "";
      }
      return prevTab;
    });
  }, [alternativas, onChange]);

  const duplicateAlternativa = useCallback((id: string) => {
    onChange((prev) => {
      const source = prev.find((a) => a.id === id);
      if (!source) return prev;
      const newAlt: Alternativa = {
        ...source,
        id: crypto.randomUUID(),
        nombre: `${source.nombre} (copia)`,
        orden: prev.length,
        items: source.items.map((item) => ({ ...item, id: crypto.randomUUID() })),
      };
      setActiveTab(newAlt.id);
      return [...prev, newAlt];
    });
  }, [onChange]);

  const renameAlternativa = useCallback((id: string, nombre: string) => {
    onChange((prev) => prev.map((a) => (a.id === id ? { ...a, nombre } : a)));
  }, [onChange]);

  const updateAltItems = useCallback((altId: string, getNewItems: (currentItems: PresupuestoItem[]) => PresupuestoItem[]) => {
    onChange((prev) =>
      prev.map((a) => {
        if (a.id !== altId) return a;
        const newItems = getNewItems(a.items);
        const totales = calcularTotales(newItems);
        return { ...a, items: newItems, ...totales };
      })
    );
  }, [onChange]);

  const addProductoToAlt = useCallback((altId: string, producto: Producto) => {
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
    updateAltItems(altId, (items) => [...items, newItem]);

    supabase.functions.invoke("enriquecer-producto", {
      body: { nombre: producto.nombre },
    }).then(({ data }) => {
      if (data?.imagen || data?.descripcion) {
        updateAltItems(altId, (items) =>
          items.map((item) =>
            item.id === itemId
              ? { ...item, producto_imagen: data.imagen || item.producto_imagen, producto_descripcion: data.descripcion || item.producto_descripcion }
              : item
          )
        );
      }
      if (data?.m2_por_caja) {
        supabase.from("productos").update({ m2_por_caja: data.m2_por_caja }).eq("nombre", producto.nombre).then(() => {});
      }
    }).catch(() => {});
  }, [updateAltItems]);

  const addManualItemToAlt = useCallback((altId: string) => {
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
    updateAltItems(altId, (items) => [...items, newItem]);
    const nombreToEnrich = manualNombre;
    const tipoToEnrich = manualTipo;
    setManualNombre("");
    setManualPrecio("");

    if (tipoToEnrich === "material") {
      supabase.functions.invoke("enriquecer-producto", {
        body: { nombre: nombreToEnrich },
      }).then(({ data }) => {
        if (data?.imagen || data?.descripcion) {
          updateAltItems(altId, (items) =>
            items.map((item) =>
              item.id === itemId
                ? { ...item, producto_imagen: data.imagen || item.producto_imagen, producto_descripcion: data.descripcion || item.producto_descripcion }
                : item
            )
          );
        }
      }).catch(() => {});
    }
  }, [updateAltItems, manualNombre, manualPrecio, manualTipo]);

  const updateItemInAlt = useCallback((altId: string, index: number, field: string, value: string | number) => {
    updateAltItems(altId, (items) => {
      const updated = [...items];
      const parsedValue = field === "mostrar_imagen" ? value === 1 : value;
      const item = { ...updated[index], [field]: parsedValue };
      item.subtotal = calcularSubtotalItem(item);
      updated[index] = item;
      return updated;
    });
  }, [updateAltItems]);

  const removeItemFromAlt = useCallback((altId: string, index: number) => {
    updateAltItems(altId, (items) => items.filter((_, i) => i !== index));
  }, [updateAltItems]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            Alternativas del Presupuesto
          </CardTitle>
          <Button variant="outline" size="sm" onClick={addAlternativa} className="gap-1">
            <Plus className="h-4 w-4" /> Nueva Alternativa
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full flex-wrap h-auto gap-1">
            {alternativas.map((alt) => (
              <TabsTrigger key={alt.id} value={alt.id} className="text-xs">
                {alt.nombre}
              </TabsTrigger>
            ))}
          </TabsList>

          {alternativas.map((alt) => (
            <TabsContent key={alt.id} value={alt.id} className="space-y-4 mt-4">
              {/* Alt header */}
              <div className="flex gap-2 items-center flex-wrap">
                <Input
                  value={alt.nombre}
                  onChange={(e) => renameAlternativa(alt.id, e.target.value)}
                  className="h-8 text-sm max-w-[200px]"
                />
                <Button variant="ghost" size="sm" onClick={() => duplicateAlternativa(alt.id)} className="gap-1 text-xs">
                  <Copy className="h-3.5 w-3.5" /> Duplicar
                </Button>
                {alternativas.length > 1 && (
                  <Button variant="ghost" size="sm" onClick={() => removeAlternativa(alt.id)} className="gap-1 text-xs text-destructive hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" /> Eliminar
                  </Button>
                )}
              </div>

              {/* Product search */}
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Buscar en catálogo</Label>
                <ProductoSearch onSelect={(p) => addProductoToAlt(alt.id, p)} />
              </div>

              {/* Manual entry */}
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
                <Button onClick={() => addManualItemToAlt(alt.id)} variant="outline" className="gap-1">
                  <Plus className="h-4 w-4" /> Agregar
                </Button>
              </div>

              {/* Items */}
              <ItemsTable
                items={alt.items}
                onUpdate={(i, f, v) => updateItemInAlt(alt.id, i, f, v)}
                onRemove={(i) => removeItemFromAlt(alt.id, i)}
              />

              {/* Totals */}
              <TotalesPanel
                subtotalMateriales={alt.subtotal_materiales}
                subtotalManoObra={alt.subtotal_mano_obra}
                iva={alt.iva}
                total={alt.total}
              />
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default AlternativasManager;
