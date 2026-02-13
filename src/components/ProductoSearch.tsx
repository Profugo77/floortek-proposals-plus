import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Producto } from "@/types/presupuesto";
import { Search } from "lucide-react";

interface Props {
  onSelect: (producto: Producto) => void;
}

const ProductoSearch = ({ onSelect }: Props) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Producto[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from("productos")
        .select("*")
        .ilike("nombre", `%${query}%`)
        .limit(10);
      if (data) {
        setResults(data.map(p => ({ ...p, tipo: p.tipo as 'material' | 'mano_obra' })));
        setOpen(true);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar producto del catálogo..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-60 overflow-auto">
          {results.map((p) => (
            <button
              key={p.id}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-accent transition-colors text-left"
              onClick={() => {
                onSelect(p);
                setQuery("");
                setOpen(false);
              }}
            >
              {p.imagen_url && (
                <img src={p.imagen_url} alt="" className="h-8 w-8 rounded object-cover" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{p.nombre}</p>
                <p className="text-xs text-muted-foreground">{p.categoria}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold">${p.precio.toLocaleString("es-AR")}</p>
                <p className="text-xs text-muted-foreground">
                  {p.tipo === "material" ? "IVA inc." : "Sin IVA"}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductoSearch;
