import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface PisoSinCajas {
  nombre: string;
  cantidadM2: number;
}

interface Props {
  open: boolean;
  pisos: PisoSinCajas[];
  onCancel: () => void;
  /** Devuelve mapa nombre -> m² por caja. Si el usuario deja vacío un campo, se omite (no se calculan cajas de ese piso). */
  onConfirm: (valores: Record<string, number>) => void;
}

const M2PorCajaDialog = ({ open, pisos, onCancel, onConfirm }: Props) => {
  const [valores, setValores] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      const init: Record<string, string> = {};
      pisos.forEach((p) => (init[p.nombre] = ""));
      setValores(init);
    }
  }, [open, pisos]);

  const handleConfirm = () => {
    const out: Record<string, number> = {};
    Object.entries(valores).forEach(([nombre, raw]) => {
      const v = parseFloat(raw.replace(",", "."));
      if (!isNaN(v) && v > 0) out[nombre] = v;
    });
    onConfirm(out);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Cobertura por caja</DialogTitle>
          <DialogDescription>
            No pudimos detectar automáticamente cuántos m² cubre cada caja. Ingresá el valor y se guardará para próximas obras. Dejalo vacío para omitir el cálculo de cajas en ese material.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2 max-h-[50vh] overflow-y-auto">
          {pisos.map((p) => (
            <div key={p.nombre} className="space-y-1">
              <Label className="text-sm font-medium">{p.nombre}</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  inputMode="decimal"
                  placeholder="ej: 2.20"
                  value={valores[p.nombre] || ""}
                  onChange={(e) =>
                    setValores((prev) => ({ ...prev, [p.nombre]: e.target.value }))
                  }
                  className="max-w-[140px]"
                />
                <span className="text-sm text-muted-foreground">
                  m²/caja · obra: {p.cantidadM2} m²
                </span>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm}>Generar PDF</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default M2PorCajaDialog;
