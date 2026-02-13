import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, MapPin, Phone } from "lucide-react";

interface Props {
  nombre: string;
  direccion: string;
  telefono: string;
  onChange: (field: string, value: string) => void;
}

const ClienteForm = ({ nombre, direccion, telefono, onChange }: Props) => {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          Datos del Cliente
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="nombre">Nombre / Razón Social</Label>
            <Input
              id="nombre"
              placeholder="Nombre del cliente"
              value={nombre}
              onChange={(e) => onChange("cliente_nombre", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="direccion" className="flex items-center gap-1">
              <MapPin className="h-3 w-3" /> Dirección
            </Label>
            <Input
              id="direccion"
              placeholder="Dirección de la obra"
              value={direccion}
              onChange={(e) => onChange("cliente_direccion", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="telefono" className="flex items-center gap-1">
              <Phone className="h-3 w-3" /> Teléfono
            </Label>
            <Input
              id="telefono"
              placeholder="Teléfono de contacto"
              value={telefono}
              onChange={(e) => onChange("cliente_telefono", e.target.value)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ClienteForm;
