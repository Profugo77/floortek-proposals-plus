import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Loader2, Wand2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PresupuestoItem } from "@/types/presupuesto";
import { calcularSubtotalItem } from "@/types/presupuesto";
import { toast } from "sonner";

interface EnrichedItem {
  producto_nombre: string;
  producto_imagen: string | null;
  producto_descripcion?: string | null;
  tipo: "material" | "mano_obra";
  precio_unitario: number;
  cantidad: number;
  descuento: number;
  fuente: string;
}

interface ParseResult {
  cliente_nombre: string;
  cliente_direccion: string;
  cliente_telefono: string;
  items: EnrichedItem[];
  transcript: string;
}

interface Props {
  onResult: (result: ParseResult) => void;
}

const VoiceDictation = ({ onResult }: Props) => {
  const [listening, setListening] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimText, setInterimText] = useState("");
  const recognitionRef = useRef<any>(null);
  const fullTranscriptRef = useRef("");

  const startListening = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error("Tu navegador no soporta reconocimiento de voz. Usá Chrome o Edge.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "es-AR";
    recognition.continuous = true;
    recognition.interimResults = true;

    fullTranscriptRef.current = "";
    setTranscript("");
    setInterimText("");

    recognition.onresult = (event: any) => {
      let finalText = "";
      let interim = "";

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript + " ";
        } else {
          interim += result[0].transcript;
        }
      }

      if (finalText) {
        fullTranscriptRef.current = finalText.trim();
        setTranscript(finalText.trim());
      }
      setInterimText(interim);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech error:", event.error);
      if (event.error === "not-allowed") {
        toast.error("Permití el acceso al micrófono para usar el dictado.");
        setListening(false);
      }
      // Don't stop on "no-speech" — keep listening
    };

    recognition.onend = () => {
      // If still in listening mode, restart (browser sometimes stops continuous)
      if (recognitionRef.current && listening) {
        try {
          recognition.start();
        } catch {
          setListening(false);
        }
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
      toast.info("🎤 Dictá el presupuesto completo. Cuando termines, tocá 'Procesar'.");
    } catch {
      toast.error("No se pudo iniciar el micrófono.");
    }
  }, [listening]);

  const stopAndProcess = useCallback(async () => {
    if (recognitionRef.current) {
      recognitionRef.current.onend = null; // prevent restart
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setListening(false);
    setInterimText("");

    const finalTranscript = fullTranscriptRef.current;
    if (!finalTranscript || finalTranscript.length < 5) {
      toast.error("No se capturó suficiente audio. Intentá de nuevo.");
      return;
    }

    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("parsear-presupuesto", {
        body: { transcript: finalTranscript },
      });

      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }

      const itemCount = data.items?.length || 0;
      const fromTienda = data.items?.filter((i: any) => i.fuente === "tiendapisos").length || 0;
      const manual = itemCount - fromTienda;

      toast.success(
        `✅ Presupuesto interpretado: ${itemCount} productos${fromTienda > 0 ? ` (${fromTienda} con precio de tiendapisos.com)` : ""}${manual > 0 ? ` (${manual} sin precio, completalos)` : ""}`
      );

      onResult(data as ParseResult);
    } catch (err: any) {
      console.error("Parse error:", err);
      toast.error("Error procesando el dictado: " + (err.message || "Intentá de nuevo"));
    } finally {
      setProcessing(false);
    }
  }, [onResult]);

  const cancel = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setListening(false);
    setTranscript("");
    setInterimText("");
    fullTranscriptRef.current = "";
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        {!listening && !processing && (
          <Button
            type="button"
            onClick={startListening}
            variant="outline"
            className="gap-2"
          >
            <Mic className="h-4 w-4" />
            Dictar presupuesto
          </Button>
        )}

        {listening && (
          <>
            <Button
              type="button"
              onClick={stopAndProcess}
              className="gap-2"
            >
              <Wand2 className="h-4 w-4" />
              Procesar dictado
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={cancel}
              size="sm"
            >
              Cancelar
            </Button>
            <span className="flex items-center gap-1.5 text-sm text-destructive font-medium">
              <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
              Grabando...
            </span>
          </>
        )}

        {processing && (
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Interpretando dictado y buscando precios en tiendapisos.com...
          </span>
        )}
      </div>

      {(listening || transcript) && (
        <div className="rounded-md border bg-muted/50 p-3 text-sm max-h-32 overflow-auto">
          <p className="text-muted-foreground text-xs mb-1 font-medium">Transcripción:</p>
          <p>
            {transcript}
            {interimText && (
              <span className="text-muted-foreground italic"> {interimText}</span>
            )}
            {!transcript && !interimText && (
              <span className="text-muted-foreground italic">Esperando que hables...</span>
            )}
          </p>
        </div>
      )}
    </div>
  );
};

export default VoiceDictation;
