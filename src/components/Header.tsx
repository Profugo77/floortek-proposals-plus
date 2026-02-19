import { Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { toast } from "sonner";

const Header = () => {
  const location = useLocation();

  return (
    <header className="bg-primary text-primary-foreground shadow-lg">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <img
            src="/logo_floortek.jpg"
            alt="FloorTek"
            className="h-12 w-auto rounded bg-white p-1"
          />
          <div>
            <h1 className="text-xl font-bold tracking-tight">FloorTek</h1>
            <p className="text-xs opacity-80 italic">Hacemos de tu casa, tu hogar</p>
          </div>
        </Link>
        <nav className="flex gap-1">
          <Link
            to="/"
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              location.pathname === "/"
                ? "bg-primary-foreground/20"
                : "hover:bg-primary-foreground/10"
            }`}
          >
            Nuevo Presupuesto
          </Link>
          <Link
            to="/historial"
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              location.pathname === "/historial"
                ? "bg-primary-foreground/20"
                : "hover:bg-primary-foreground/10"
            }`}
          >
            Historial
          </Link>
          <Link
            to="/productos"
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              location.pathname === "/productos"
                ? "bg-primary-foreground/20"
                : "hover:bg-primary-foreground/10"
            }`}
          >
            Productos
          </Link>
          <Link
            to="/usuarios"
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              location.pathname === "/usuarios"
                ? "bg-primary-foreground/20"
                : "hover:bg-primary-foreground/10"
            }`}
          >
            Usuarios
          </Link>
          <Button
            variant="ghost"
            size="sm"
            className="text-primary-foreground hover:bg-primary-foreground/10 gap-1"
            onClick={async () => {
              await supabase.auth.signOut();
              toast.info("Sesión cerrada");
            }}
          >
            <LogOut className="h-4 w-4" />
            Salir
          </Button>
        </nav>
      </div>
    </header>
  );
};

export default Header;
