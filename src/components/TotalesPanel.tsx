import { Card, CardContent } from "@/components/ui/card";

interface Props {
  subtotalMateriales: number;
  subtotalManoObra: number;
  iva: number;
  total: number;
}

const fmt = (n: number) => n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const TotalesPanel = ({ subtotalMateriales, subtotalManoObra, iva, total }: Props) => {
  return (
    <Card className="border-primary/30">
      <CardContent className="pt-4 pb-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal Materiales (neto)</span>
          <span className="font-medium">${fmt(subtotalMateriales)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal Mano de Obra (neto)</span>
          <span className="font-medium">${fmt(subtotalManoObra)}</span>
        </div>
        <div className="border-t pt-2 flex justify-between text-sm">
          <span className="text-muted-foreground">IVA (21%)</span>
          <span className="font-medium">${fmt(iva)}</span>
        </div>
        <div className="border-t pt-2 flex justify-between text-lg font-bold">
          <span>TOTAL</span>
          <span className="text-primary">${fmt(total)}</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default TotalesPanel;
