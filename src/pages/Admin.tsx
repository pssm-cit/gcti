import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Edit, Users, Settings } from "lucide-react";

export default function Admin() {
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [tenantIdByUser, setTenantIdByUser] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  
  // Estados para modais
  const [tenantDialogOpen, setTenantDialogOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<any | null>(null);
  const [tenantName, setTenantName] = useState("");
  
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [userTenantId, setUserTenantId] = useState<string>("");
  const [userIsActive, setUserIsActive] = useState(true);

  const loadData = async () => {
    try {
      // Carregar usuários pendentes
      const { data: pend, error: pendError } = await supabase
        .from("profiles")
        .select("id, full_name, status, tenant_id, created_at")
        .eq("status", "pending");
      
      if (pendError) {
        toast.error("Erro ao carregar usuários pendentes: " + pendError.message);
      } else {
        setPendingUsers(pend || []);
      }
      
      // Carregar todos os usuários
      const { data: all, error: allError } = await supabase
        .from("profiles")
        .select(`
          id,
          full_name,
          status,
          tenant_id,
          created_at,
          tenants (
            id,
            name
          )
        `)
        .order("created_at", { ascending: false });
      
      if (allError) {
        toast.error("Erro ao carregar usuários: " + allError.message);
      } else {
        setAllUsers(all || []);
      }
      
      // Carregar tenants
      const { data: t, error: tenantsError } = await supabase
        .from("tenants")
        .select("id, name")
        .order("name");
      
      if (tenantsError) {
        toast.error("Erro ao carregar tenants: " + tenantsError.message);
      } else {
        setTenants(t || []);
      }
    } catch (error: any) {
      toast.error("Erro ao carregar dados: " + error.message);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenTenantDialog = (tenant?: any) => {
    if (tenant) {
      setEditingTenant(tenant);
      setTenantName(tenant.name);
    } else {
      setEditingTenant(null);
      setTenantName("");
    }
    setTenantDialogOpen(true);
  };

  const handleCloseTenantDialog = () => {
    setTenantDialogOpen(false);
    setEditingTenant(null);
    setTenantName("");
  };

  const handleSaveTenant = async () => {
    if (!tenantName.trim()) {
      toast.error("Digite um nome para o tenant");
      return;
    }

    setLoading(true);
    try {
      if (editingTenant) {
        // Atualizar tenant existente
        const { error } = await supabase
          .from("tenants")
          .update({ name: tenantName.trim() })
          .eq("id", editingTenant.id);
        
        if (error) throw error;
        toast.success("Tenant atualizado com sucesso!");
      } else {
        // Criar novo tenant
        const { error } = await supabase
          .from("tenants")
          .insert({ name: tenantName.trim() })
          .select()
          .single();
        
        if (error) throw error;
        toast.success("Tenant criado com sucesso!");
      }
      
      handleCloseTenantDialog();
      loadData();
    } catch (e: any) {
      toast.error("Erro ao salvar tenant: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenUserDialog = (user: any) => {
    setEditingUser(user);
    setUserTenantId(user.tenant_id || "");
    setUserIsActive(user.status === "approved");
    setUserDialogOpen(true);
  };

  const handleCloseUserDialog = () => {
    setUserDialogOpen(false);
    setEditingUser(null);
    setUserTenantId("");
    setUserIsActive(true);
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;

    setLoading(true);
    try {
      const updatePayload: any = {
        status: userIsActive ? "approved" : "pending",
      };
      
      if (userTenantId) {
        updatePayload.tenant_id = userTenantId;
      } else {
        updatePayload.tenant_id = null;
      }

      const { error } = await supabase
        .from("profiles")
        .update(updatePayload)
        .eq("id", editingUser.id);
      
      if (error) throw error;
      
      toast.success("Usuário atualizado com sucesso!");
      handleCloseUserDialog();
      loadData();
    } catch (e: any) {
      toast.error("Erro ao atualizar usuário: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const approveUser = async (userId: string) => {
    const tenantId = tenantIdByUser[userId];
    if (!tenantId) {
      toast.error("Selecione um tenant para aprovar o usuário");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ status: "approved", tenant_id: tenantId })
        .eq("id", userId);
      
      if (error) throw error;
      
      toast.success("Usuário aprovado");
      setTenantIdByUser((p) => ({ ...p, [userId]: "" }));
      loadData();
    } catch (e: any) {
      toast.error("Erro ao aprovar usuário: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <h2 className="text-3xl font-bold mb-6">Administração</h2>

        {/* Gestão de Tenants */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Gestão de Tenants
              </CardTitle>
              <Button onClick={() => handleOpenTenantDialog()} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Novo Tenant
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {tenants.length === 0 ? (
              <p className="text-muted-foreground">Nenhum tenant cadastrado.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {tenants.map((tenant) => (
                  <div
                    key={tenant.id}
                    className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50 cursor-pointer"
                    onClick={() => handleOpenTenantDialog(tenant)}
                  >
                    <span className="font-medium">{tenant.name}</span>
                    <Button variant="ghost" size="sm" onClick={(e) => {
                      e.stopPropagation();
                      handleOpenTenantDialog(tenant);
                    }}>
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Usuários Pendentes */}
        <Card className="mb-6">
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
                    <Label className="text-sm text-muted-foreground">Tenant</Label>
                    <div className="flex gap-2">
                      <Select
                        value={tenantIdByUser[u.id] || ""}
                        onValueChange={(value) => setTenantIdByUser((p) => ({ ...p, [u.id]: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um tenant" />
                        </SelectTrigger>
                        <SelectContent>
                          {tenants.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          handleOpenTenantDialog();
                        }}
                        title="Criar novo tenant"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="md:text-right">
                    <Button onClick={() => approveUser(u.id)} disabled={loading || !tenantIdByUser[u.id]}>
                      Aprovar
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Todos os Usuários */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Todos os Usuários
            </CardTitle>
          </CardHeader>
          <CardContent>
            {allUsers.length === 0 ? (
              <p className="text-muted-foreground">Nenhum usuário cadastrado.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allUsers.map((user) => (
                    <TableRow
                      key={user.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleOpenUserDialog(user)}
                    >
                      <TableCell className="font-medium">{user.full_name || "-"}</TableCell>
                      <TableCell>
                        {user.tenants ? (
                          <Badge variant="secondary">{user.tenants.name}</Badge>
                        ) : (
                          <span className="text-muted-foreground">Sem tenant</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.status === "approved" ? "default" : "secondary"}>
                          {user.status === "approved" ? "Aprovado" : "Pendente"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenUserDialog(user);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Modal de Tenant */}
        <Dialog open={tenantDialogOpen} onOpenChange={setTenantDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingTenant ? "Editar Tenant" : "Novo Tenant"}</DialogTitle>
              <DialogDescription>
                {editingTenant ? "Altere o nome do tenant" : "Digite o nome do novo tenant"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tenant-name">Nome do Tenant</Label>
                <Input
                  id="tenant-name"
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                  placeholder="Digite o nome do tenant"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSaveTenant();
                    }
                  }}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleCloseTenantDialog}>
                Cancelar
              </Button>
              <Button onClick={handleSaveTenant} disabled={loading}>
                {loading ? "Salvando..." : editingTenant ? "Atualizar" : "Criar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de Usuário */}
        <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Usuário</DialogTitle>
              <DialogDescription>
                {editingUser && `Alterar configurações de ${editingUser.full_name || editingUser.id}`}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="user-tenant">Tenant</Label>
                <div className="flex gap-2">
                  <Select
                    value={userTenantId}
                    onValueChange={setUserTenantId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um tenant" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Sem tenant</SelectItem>
                      {tenants.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      setTenantName("");
                      setEditingTenant(null);
                      setTenantDialogOpen(true);
                    }}
                    title="Criar novo tenant"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="user-status">Status</Label>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="user-status"
                    checked={userIsActive}
                    onCheckedChange={setUserIsActive}
                  />
                  <Label htmlFor="user-status" className="cursor-pointer">
                    {userIsActive ? "Aprovado" : "Pendente"}
                  </Label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleCloseUserDialog}>
                Cancelar
              </Button>
              <Button onClick={handleSaveUser} disabled={loading}>
                {loading ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
