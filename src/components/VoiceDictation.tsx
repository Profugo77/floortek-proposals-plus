import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PresupuestoItem } from "@/types/presupuesto";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface ScrapedProduct {
  nombre: string;
  precio: number;
  imagen: string | null;
  link?: string;
}

interface Props {
  onAddItem: (item: Omit<PresupuestoItem, "id" | "subtotal">) => void;
}

const VoiceDictation = ({ onAddItem }: Props) => {
  const [listening, setListening] = useState(false);
  const [searching, setSearching] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [results, setResults] = useState<ScrapedProduct[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const recognitionRef = useRef<any>(null);

  const startListening = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error("Tu navegador no soporta reconocimiento de voz. Usá Chrome o Edge.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "es-AR";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = async (event: any) => {
      const text = event.results[0][0].transcript;
      setTranscript(text);
      setListening(false);
      await searchProduct(text);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech error:", event.error);
      setListening(false);
      if (event.error === "not-allowed") {
        toast.error("Permití el acceso al micrófono para usar el dictado.");
      } else {
        toast.error("Error en el reconocimiento de voz. Intentá de nuevo.");
      }
    };

    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
    setTranscript("");
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  const searchProduct = async (text: string) => {
    setSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke("buscar-producto", {
        body: { query: text },
      });

      if (error) throw error;

      if (data?.found && data.products?.length > 0) {
        setResults(data.products);
        setSelectedIdx(0);
        setShowResults(true);
      } else {
        // Not found — add as literal manual item
        toast.info(`No se encontró "${text}" en tiendapisos.com. Se agrega como producto manual.`);
        onAddItem({
          producto_nombre: text,
          producto_imagen: null,
          tipo: "material",
          precio_unitario: 0,
          cantidad: 1,
          descuento: 0,
        });
      }
    } catch (err: any) {
      console.error("Search error:", err);
      toast.error("Error buscando el producto. Se agrega como texto literal.");
      onAddItem({
        producto_nombre: text,
        producto_imagen: null,
        tipo: "material",
        precio_unitario: 0,
        cantidad: 1,
        descuento: 0,
      });
    } finally {
      setSearching(false);
    }
  };

  const handleConfirm = () => {
    const product = results[selectedIdx];
    if (product) {
      onAddItem({
        producto_nombre: product.nombre,
        producto_imagen: product.imagen,
        tipo: "material",
        precio_unitario: product.precio,
        cantidad: 1,
        descuento: 0,
      });
      toast.success(`"${product.nombre}" agregado desde tiendapisos.com`);
    }
    setShowResults(false);
    setResults([]);
  };

  const handleAddLiteral = () => {
    onAddItem({
      producto_nombre: transcript,
      producto_imagen: null,
      tipo: "material",
      precio_unitario: 0,
      cantidad: 1,
      descuento: 0,
    });
    toast.info(`"${transcript}" agregado como producto manual.`);
    setShowResults(false);
    setResults([]);
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant={listening ? "destructive" : "outline"}
          size="icon"
          onClick={listening ? stopListening : startListening}
          disabled={searching}
          className="relative"
          title={listening ? "Detener dictado" : "Dictar producto por voz"}
        >
          {searching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : listening ? (
            <>
              <MicOff className="h-4 w-4" />
              <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 animate-pulse" />
            </>
          ) : (
            <Mic className="h-4 w-4" />
          )}
        </Button>
        {listening && (
          <span className="text-sm text-muted-foreground animate-pulse">
            Escuchando...
          </span>
        )}
        {searching && (
          <span className="text-sm text-muted-foreground">
            Buscando en tiendapisos.com...
          </span>
        )}
        {transcript && !listening && !searching && (
          <span className="text-sm text-muted-foreground">
            Escuché: "<strong>{transcript}</strong>"
          </span>
        )}
      </div>

      <Dialog open={showResults} onOpenChange={setShowResults}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Productos encontrados</DialogTitle>
            <DialogDescription>
              Buscaste "{transcript}" en tiendapisos.com. Seleccioná el producto correcto:
            </DialogDescription>
          </DialogHeader>

          <RadioGroup
            value={String(selectedIdx)}
            onValueChange={(v) => setSelectedIdx(Number(v))}
            className="space-y-3 max-h-64 overflow-auto"
          >
            {results.map((p, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-2 rounded-md border cursor-pointer hover:bg-accent transition-colors"
                onClick={() => setSelectedIdx(i)}
              >
                <RadioGroupItem value={String(i)} id={`product-${i}`} />
                {p.imagen && (
                  <img
                    src={p.imagen}
                    alt=""
                    className="h-10 w-10 rounded object-cover flex-shrink-0"
                  />
                )}
                <Label htmlFor={`product-${i}`} className="flex-1 cursor-pointer">
                  <p className="font-medium text-sm">{p.nombre}</p>
                  {p.precio > 0 && (
                    <p className="text-xs text-muted-foreground">
                      ${p.precio.toLocaleString("es-AR")}
                    </p>
                  )}
                </Label>
              </div>
            ))}
          </RadioGroup>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="ghost" onClick={handleAddLiteral} className="text-sm">
              Agregar como texto literal
            </Button>
            <Button onClick={handleConfirm}>Agregar seleccionado</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default VoiceDictation;
