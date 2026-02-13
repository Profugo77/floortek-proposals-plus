import { PresupuestoItem, calcularSubtotalItem } from "@/types/presupuesto";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2 } from "lucide-react";

interface Props {
  items: PresupuestoItem[];
  onUpdate: (index: number, field: string, value: string | number) => void;
  onRemove: (index: number) => void;
}

const ItemsTable = ({ items, onUpdate, onRemove }: Props) => {
  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Agregá productos desde el buscador o manualmente para comenzar
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-primary text-primary-foreground">
            <th className="px-3 py-2 text-left rounded-tl-md">Producto</th>
            <th className="px-3 py-2 text-center w-28">Tipo</th>
            <th className="px-3 py-2 text-right w-28">Precio Unit.</th>
            <th className="px-3 py-2 text-center w-20">Cant.</th>
            <th className="px-3 py-2 text-center w-20">Desc.%</th>
            <th className="px-3 py-2 text-right w-28">Subtotal</th>
            <th className="px-3 py-2 w-10 rounded-tr-md"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={item.id} className="border-b hover:bg-muted/50 transition-colors">
              <td className="px-3 py-2">
                <div className="flex items-center gap-2">
                  {item.producto_imagen && (
                    <img src={item.producto_imagen} alt="" className="h-8 w-8 rounded object-cover" />
                  )}
                  <Input
                    value={item.producto_nombre}
                    onChange={(e) => onUpdate(i, "producto_nombre", e.target.value)}
                    className="h-8 text-sm border-0 bg-transparent px-1 focus-visible:ring-1"
                  />
                </div>
              </td>
              <td className="px-1 py-2">
                <Select
                  value={item.tipo}
                  onValueChange={(v) => onUpdate(i, "tipo", v)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="material">Material</SelectItem>
                    <SelectItem value="mano_obra">Mano de Obra</SelectItem>
                  </SelectContent>
                </Select>
              </td>
              <td className="px-1 py-2">
                <Input
                  type="number"
                  min={0}
                  value={item.precio_unitario}
                  onChange={(e) => onUpdate(i, "precio_unitario", parseFloat(e.target.value) || 0)}
                  className="h-8 text-sm text-right w-full"
                />
              </td>
              <td className="px-1 py-2">
                <Input
                  type="number"
                  min={0}
                  step={0.5}
                  value={item.cantidad}
                  onChange={(e) => onUpdate(i, "cantidad", parseFloat(e.target.value) || 0)}
                  className="h-8 text-sm text-center w-full"
                />
              </td>
              <td className="px-1 py-2">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={item.descuento}
                  onChange={(e) => onUpdate(i, "descuento", parseFloat(e.target.value) || 0)}
                  className="h-8 text-sm text-center w-full"
                />
              </td>
              <td className="px-3 py-2 text-right font-semibold">
                ${calcularSubtotalItem(item).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
              </td>
              <td className="px-1 py-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => onRemove(i)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ItemsTable;
