import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UNIDADES, Unidad } from "@/lib/unidades";

export interface MaterialFaltante {
  nombre: string;
  cantidad: number;
}

interface Props {
  open: boolean;
  materiales: MaterialFaltante[];
  onCancel: () => void;
  onConfirm: (unidadesPorNombre: Record<string, Unidad>) => void;
}

const UnidadesFaltantesDialog = ({ open, materiales, onCancel, onConfirm }: Props) => {
  const [seleccion, setSeleccion] = useState<Record<string, Unidad>>({});

  useEffect(() => {
    if (open) {
      const init: Record<string, Unidad> = {};
      materiales.forEach((m) => (init[m.nombre] = "u"));
      setSeleccion(init);
    }
  }, [open, materiales]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Indicar unidad de medida</DialogTitle>
          <DialogDescription>
            No pude detectar la unidad de estos materiales. Elegí la correcta para cada uno
            (se guardará en el producto para futuros presupuestos).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 max-h-[50vh] overflow-y-auto py-2">
          {materiales.map((m) => (
            <div
              key={m.nombre}
              className="flex items-center gap-3 border rounded-md p-2"
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{m.nombre}</div>
                <div className="text-xs text-muted-foreground">Cantidad: {m.cantidad}</div>
              </div>
              <Select
                value={seleccion[m.nombre]}
                onValueChange={(v) =>
                  setSeleccion((s) => ({ ...s, [m.nombre]: v as Unidad }))
                }
              >
                <SelectTrigger className="w-24 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNIDADES.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button onClick={() => onConfirm(seleccion)}>Generar PDF</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UnidadesFaltantesDialog;
