import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { UserCheck, UserX, Users } from "lucide-react";

interface Profile {
  id: string;
  user_id: string;
  email: string;
  approved: boolean;
  created_at: string;
}

const Usuarios = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProfiles = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Error cargando usuarios");
      return;
    }
    setProfiles(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const toggleApproval = async (profile: Profile) => {
    const { error } = await supabase
      .from("profiles")
      .update({ approved: !profile.approved })
      .eq("id", profile.id);

    if (error) {
      toast.error("Error actualizando usuario");
      return;
    }

    toast.success(profile.approved ? "Usuario desactivado" : "Usuario aprobado");
    fetchProfiles();
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Gestión de Usuarios
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground text-sm">Cargando...</p>
            ) : profiles.length === 0 ? (
              <p className="text-muted-foreground text-sm">No hay usuarios registrados.</p>
            ) : (
              <div className="space-y-3">
                {profiles.map((profile) => (
                  <div
                    key={profile.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-sm">{profile.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Registrado: {new Date(profile.created_at).toLocaleDateString("es-AR")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={profile.approved ? "default" : "secondary"}>
                        {profile.approved ? "Aprobado" : "Pendiente"}
                      </Badge>
                      <Button
                        size="sm"
                        variant={profile.approved ? "destructive" : "default"}
                        onClick={() => toggleApproval(profile)}
                        className="gap-1"
                      >
                        {profile.approved ? (
                          <>
                            <UserX className="h-3 w-3" /> Desactivar
                          </>
                        ) : (
                          <>
                            <UserCheck className="h-3 w-3" /> Aprobar
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Usuarios;
