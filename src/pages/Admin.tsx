import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function Admin() {
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [tenantNameByUser, setTenantNameByUser] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    try {
      // Carregar pendentes
      const { data: pend, error: pendError } = await supabase
        .from("profiles")
        .select("id, full_name, status, tenant_id")
        .eq("status", "pending");
      
      if (pendError) {
        console.error("Erro ao carregar usuários pendentes:", pendError);
        toast.error("Erro ao carregar usuários pendentes: " + pendError.message);
      } else {
        console.log("Usuários pendentes carregados:", pend);
        setPendingUsers(pend || []);
      }
      
      // Carregar tenants
      const { data: t, error: tenantsError } = await supabase
        .from("tenants")
        .select("id, name")
        .order("name");
      
      if (tenantsError) {
        console.error("Erro ao carregar tenants:", tenantsError);
        toast.error("Erro ao carregar tenants: " + tenantsError.message);
      } else {
        setTenants(t || []);
      }
    } catch (error: any) {
      console.error("Erro inesperado ao carregar dados:", error);
      toast.error("Erro ao carregar dados: " + error.message);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const approveUser = async (userId: string) => {
    setLoading(true);
    try {
      let chosenTenantId: string | null = null;
      const name = tenantNameByUser[userId]?.trim();
      if (name) {
        // Criar tenant se não existir
        const existing = tenants.find((t) => t.name.toLowerCase() === name.toLowerCase());
        if (existing) {
          chosenTenantId = existing.id;
        } else {
          const { data: created, error: terr } = await supabase.from("tenants").insert({ name }).select("id").single();
          if (terr) throw terr;
          chosenTenantId = created?.id || null;
        }
      }

      const updatePayload: any = { status: "approved" };
      if (chosenTenantId) updatePayload.tenant_id = chosenTenantId;

      const { error: perr } = await supabase.from("profiles").update(updatePayload).eq("id", userId);
      if (perr) throw perr;
      toast.success("Usuário aprovado");
      setTenantNameByUser((p) => ({ ...p, [userId]: "" }));
      loadData();
    } catch (e: any) {
      console.error(e);
      toast.error("Erro ao aprovar usuário");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <h2 className="text-3xl font-bold mb-6">Administração</h2>

        <Card>
          <CardHeader>
            <CardTitle>Usuários pendentes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingUsers.length === 0 ? (
              <p className="text-muted-foreground">Nenhum usuário pendente.</p>
            ) : (
              pendingUsers.map((u) => (
                <div key={u.id} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                  <div>
                    <Label className="text-sm text-muted-foreground">Usuário</Label>
                    <p className="font-medium">{u.full_name || u.id}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Tenant (crie ou informe existente)</Label>
                    <Input
                      placeholder="Nome do tenant"
                      value={tenantNameByUser[u.id] || ""}
                      onChange={(e) => setTenantNameByUser((p) => ({ ...p, [u.id]: e.target.value }))}
                    />
                    {tenants.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">Existentes: {tenants.map((t) => t.name).join(", ")}</p>
                    )}
                  </div>
                  <div className="md:text-right">
                    <Button onClick={() => approveUser(u.id)} disabled={loading}>Aprovar</Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}


