import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Search, Building2 } from "lucide-react";

interface SupplierFormData {
  name: string;
  cpf_cnpj: string;
  invoice_sent_by_email: boolean;
  invoice_sent_by_portal: boolean;
  portal_url: string;
  portal_login: string;
  portal_password: string;
  observations: string;
  status: boolean;
}

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any | null>(null);
  const [formData, setFormData] = useState<SupplierFormData>({
    name: "",
    cpf_cnpj: "",
    invoice_sent_by_email: false,
    invoice_sent_by_portal: false,
    portal_url: "",
    portal_login: "",
    portal_password: "",
    observations: "",
    status: true,
  });

  useEffect(() => {
    loadSuppliers();
  }, []);

  useEffect(() => {
    filterSuppliers();
  }, [suppliers, searchTerm]);

  const loadSuppliers = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("suppliers")
      .select("*")
      .eq("user_id", user.id)
      .order("name");

    if (error) {
      toast.error("Erro ao carregar fornecedores");
      console.error(error);
      setLoading(false);
      return;
    }

    setSuppliers(data || []);
    setLoading(false);
  };

  const filterSuppliers = () => {
    if (!searchTerm.trim()) {
      setFilteredSuppliers(suppliers);
      return;
    }

    const filtered = suppliers.filter((supplier) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        supplier.name.toLowerCase().includes(searchLower) ||
        supplier.cpf_cnpj?.toLowerCase().includes(searchLower) ||
        supplier.observations?.toLowerCase().includes(searchLower)
      );
    });

    setFilteredSuppliers(filtered);
  };

  const handleOpenDialog = (supplier?: any) => {
    if (supplier) {
      setEditingSupplier(supplier);
      setFormData({
        name: supplier.name || "",
        cpf_cnpj: supplier.cpf_cnpj || "",
        invoice_sent_by_email: supplier.invoice_sent_by_email || false,
        invoice_sent_by_portal: supplier.invoice_sent_by_portal || false,
        portal_url: supplier.portal_url || "",
        portal_login: supplier.portal_login || "",
        portal_password: supplier.portal_password || "",
        observations: supplier.observations || "",
        status: supplier.status !== undefined ? supplier.status : true,
      });
    } else {
      setEditingSupplier(null);
      setFormData({
        name: "",
        cpf_cnpj: "",
        invoice_sent_by_email: false,
        invoice_sent_by_portal: false,
        portal_url: "",
        portal_login: "",
        portal_password: "",
        observations: "",
        status: true,
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingSupplier(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Digite um nome para o fornecedor");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const supplierData: any = {
      name: formData.name,
      user_id: user.id,
      cpf_cnpj: formData.cpf_cnpj || null,
      invoice_sent_by_email: formData.invoice_sent_by_email,
      invoice_sent_by_portal: formData.invoice_sent_by_portal,
      portal_url: formData.invoice_sent_by_portal ? formData.portal_url || null : null,
      portal_login: formData.invoice_sent_by_portal ? formData.portal_login || null : null,
      portal_password: formData.invoice_sent_by_portal ? formData.portal_password || null : null,
      observations: formData.observations || null,
      status: formData.status,
    };

    if (editingSupplier) {
      // Atualizar
      const { error } = await supabase
        .from("suppliers")
        .update(supplierData)
        .eq("id", editingSupplier.id);

      if (error) {
        toast.error("Erro ao atualizar fornecedor");
        console.error(error);
        return;
      }

      toast.success("Fornecedor atualizado com sucesso!");
    } else {
      // Criar
      const { error } = await supabase
        .from("suppliers")
        .insert([supplierData])
        .select()
        .single();

      if (error) {
        toast.error("Erro ao cadastrar fornecedor");
        console.error(error);
        return;
      }

      toast.success("Fornecedor cadastrado com sucesso!");
    }

    handleCloseDialog();
    loadSuppliers();
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold mb-2">Fornecedores</h2>
            <p className="text-muted-foreground">
              Gerencie seus fornecedores
            </p>
          </div>
          
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Fornecedor
          </Button>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, CPF/CNPJ ou observações..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filteredSuppliers.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground">
                Nenhum fornecedor encontrado
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>CPF/CNPJ</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Fatura por</TableHead>
                    <TableHead>Observações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSuppliers.map((supplier) => (
                    <TableRow 
                      key={supplier.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleOpenDialog(supplier)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-muted-foreground" />
                          {supplier.name}
                        </div>
                      </TableCell>
                      <TableCell>{supplier.cpf_cnpj || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={supplier.status ? "default" : "secondary"}>
                          {supplier.status ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {supplier.invoice_sent_by_email && (
                            <Badge variant="outline">E-mail</Badge>
                          )}
                          {supplier.invoice_sent_by_portal && (
                            <Badge variant="outline">Portal</Badge>
                          )}
                          {!supplier.invoice_sent_by_email && !supplier.invoice_sent_by_portal && (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground line-clamp-1">
                          {supplier.observations || "-"}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Modal de Cadastro/Edição */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSupplier ? "Editar Fornecedor" : "Novo Fornecedor"}
            </DialogTitle>
            <DialogDescription>
              {editingSupplier ? "Edite as informações do fornecedor" : "Preencha os dados do fornecedor"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                placeholder="Nome do fornecedor"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cpf_cnpj">CPF/CNPJ</Label>
              <Input
                id="cpf_cnpj"
                placeholder="000.000.000-00 ou 00.000.000/0000-00"
                value={formData.cpf_cnpj}
                onChange={(e) => setFormData({ ...formData, cpf_cnpj: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="status"
                  checked={formData.status}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, status: checked === true })
                  }
                />
                <Label htmlFor="status" className="font-normal cursor-pointer">
                  Ativo
                </Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Fatura enviada por:</Label>
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="invoice_email"
                    checked={formData.invoice_sent_by_email}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, invoice_sent_by_email: checked === true })
                    }
                  />
                  <Label htmlFor="invoice_email" className="font-normal cursor-pointer">
                    E-mail
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="invoice_portal"
                    checked={formData.invoice_sent_by_portal}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, invoice_sent_by_portal: checked === true })
                    }
                  />
                  <Label htmlFor="invoice_portal" className="font-normal cursor-pointer">
                    Portal
                  </Label>
                </div>
              </div>
            </div>

            {formData.invoice_sent_by_portal && (
              <div className="space-y-3 border-t pt-3">
                <div className="space-y-2">
                  <Label htmlFor="portal_url">URL do Portal</Label>
                  <Input
                    id="portal_url"
                    type="url"
                    placeholder="https://portal.exemplo.com.br"
                    value={formData.portal_url}
                    onChange={(e) => setFormData({ ...formData, portal_url: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="portal_login">Login</Label>
                  <Input
                    id="portal_login"
                    placeholder="Login do portal"
                    value={formData.portal_login}
                    onChange={(e) => setFormData({ ...formData, portal_login: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="portal_password">Senha</Label>
                  <Input
                    id="portal_password"
                    type="password"
                    placeholder="Senha do portal"
                    value={formData.portal_password}
                    onChange={(e) => setFormData({ ...formData, portal_password: e.target.value })}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="observations">Observações</Label>
              <Textarea
                id="observations"
                placeholder="Observações sobre o fornecedor"
                value={formData.observations}
                onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingSupplier ? "Salvar Alterações" : "Cadastrar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

