import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import Auth from "@/pages/Auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, LogOut } from "lucide-react";
import { toast } from "sonner";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [approved, setApproved] = useState<boolean | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        if (!session) {
          setLoading(false);
          setApproved(null);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user) return;
    
    const checkApproval = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("approved")
        .eq("user_id", session.user.id)
        .single();

      if (error || !data) {
        setApproved(false);
      } else {
        setApproved(data.approved);
      }
      setLoading(false);
    };

    checkApproval();
  }, [session]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  if (!session) return <Auth />;

  if (approved === false) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-sm text-center">
          <CardHeader>
            <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
            <CardTitle>Cuenta pendiente de aprobación</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Tu cuenta fue creada exitosamente. Un administrador debe aprobarla antes de que puedas usar la aplicación.
            </p>
            <Button
              variant="outline"
              className="gap-2"
              onClick={async () => {
                await supabase.auth.signOut();
                toast.info("Sesión cerrada");
              }}
            >
              <LogOut className="h-4 w-4" />
              Cerrar sesión
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
