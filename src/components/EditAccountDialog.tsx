import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { z } from "zod";
import { format, parseISO } from "date-fns";

const accountSchema = z.object({
  supplier_id: z.string().min(1, "Selecione um fornecedor"),
  description: z.string().min(3, "Descrição deve ter pelo menos 3 caracteres").max(200),
  amount: z.number().positive("Valor deve ser maior que zero"),
  dia_emissao: z.number().min(1, "Dia de emissão deve ser entre 1 e 31").max(31),
  dia_vencimento: z.number().min(1, "Dia de vencimento deve ser entre 1 e 31").max(31),
  data_fim: z.string().optional(),
});

interface EditAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: any;
  onSuccess: () => void;
}

export function EditAccountDialog({ open, onOpenChange, account, onSuccess }: EditAccountDialogProps) {
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [showNewSupplier, setShowNewSupplier] = useState(false);
  const [supplierFormData, setSupplierFormData] = useState({
    name: "",
    cpf_cnpj: "",
    invoice_sent_by_email: false,
    invoice_sent_by_portal: false,
    portal_url: "",
    portal_login: "",
    portal_password: "",
    observations: "",
  });
  const [isInitialized, setIsInitialized] = useState(false);

  const [formData, setFormData] = useState({
    supplier_id: "",
    description: "",
    amount: "",
    dia_emissao: new Date().getDate().toString(),
    dia_vencimento: (new Date().getDate() + 2).toString(),
    data_fim: "",
  });

  useEffect(() => {
    const initializeData = async () => {
      if (open && account) {
        setIsInitialized(false);
        
        // Primeiro carregar os suppliers
        const { data: suppliersData, error } = await supabase
          .from("suppliers")
          .select("*")
          .order("name");

        if (error) {
          console.error("Error loading suppliers:", error);
          return;
        }
        
        // Primeiro definir os suppliers
        setSuppliers(suppliersData || []);

        // Aguardar um tick para garantir que o estado foi atualizado
        await new Promise(resolve => setTimeout(resolve, 0));

        // Depois de carregar os suppliers, preencher o formData
        // Tratar data_fim que pode vir como string ISO ou formato YYYY-MM-DD
        const dataFim = account.data_fim 
          ? (account.data_fim.includes('T') 
              ? format(parseISO(account.data_fim), "yyyy-MM-dd")
              : account.data_fim.split('T')[0])
          : "";
        
        const newFormData = {
          supplier_id: account.supplier_id || "",
          description: account.description || "",
          amount: account.amount?.toString() || "",
          dia_emissao: account.dia_emissao?.toString() || new Date().getDate().toString(),
          dia_vencimento: account.dia_vencimento?.toString() || (new Date().getDate() + 2).toString(),
          data_fim: dataFim,
        };
        
        setFormData(newFormData);
        setIsInitialized(true);
      } else {
        setIsInitialized(false);
        // Reset form data quando fechar
        setFormData({
          supplier_id: "",
          description: "",
          amount: "",
          dia_emissao: new Date().getDate().toString(),
          dia_vencimento: (new Date().getDate() + 2).toString(),
          data_fim: "",
        });
        setSuppliers([]);
      }
    };

    initializeData();
  }, [open, account]);

  const handleAddSupplier = async () => {
    if (!supplierFormData.name.trim()) {
      toast.error("Digite um nome para o fornecedor");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const supplierData: any = {
      name: supplierFormData.name,
      user_id: user.id,
      cpf_cnpj: supplierFormData.cpf_cnpj || null,
      invoice_sent_by_email: supplierFormData.invoice_sent_by_email,
      invoice_sent_by_portal: supplierFormData.invoice_sent_by_portal,
      portal_url: supplierFormData.invoice_sent_by_portal ? supplierFormData.portal_url || null : null,
      portal_login: supplierFormData.invoice_sent_by_portal ? supplierFormData.portal_login || null : null,
      portal_password: supplierFormData.invoice_sent_by_portal ? supplierFormData.portal_password || null : null,
      observations: supplierFormData.observations || null,
    };

    const { data, error } = await supabase
      .from("suppliers")
      .insert([supplierData])
      .select()
      .single();

    if (error) {
      toast.error("Erro ao adicionar fornecedor");
      console.error(error);
      return;
    }

    toast.success("Fornecedor adicionado!");
    setSuppliers([...suppliers, data]);
    setFormData({ ...formData, supplier_id: data.id });
    setSupplierFormData({
      name: "",
      cpf_cnpj: "",
      invoice_sent_by_email: false,
      invoice_sent_by_portal: false,
      portal_url: "",
      portal_login: "",
      portal_password: "",
      observations: "",
    });
    setShowNewSupplier(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = accountSchema.safeParse({
      ...formData,
      amount: parseFloat(formData.amount),
      dia_emissao: parseInt(formData.dia_emissao),
      dia_vencimento: parseInt(formData.dia_vencimento),
      data_fim: formData.data_fim || undefined,
    });

    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .from("accounts")
      .update({
        supplier_id: formData.supplier_id,
        description: formData.description,
        amount: parseFloat(formData.amount),
        dia_emissao: parseInt(formData.dia_emissao),
        dia_vencimento: parseInt(formData.dia_vencimento),
        data_fim: formData.data_fim || null,
      })
      .eq("id", account.id);

    setLoading(false);

    if (error) {
      toast.error("Erro ao atualizar conta");
      console.error(error);
      return;
    }

    toast.success("Conta atualizada com sucesso!");
    onSuccess();
    onOpenChange(false);
  };

  if (!account) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Conta</DialogTitle>
          <DialogDescription>
            Edite as informações da conta
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Fornecedor</Label>
            {!showNewSupplier ? (
                             <div className="flex gap-2">
                 <Select
                   key={`select-${suppliers.length}-${formData.supplier_id}`}
                   value={formData.supplier_id || undefined}
                   onValueChange={(value) => {
                     if (value && value !== formData.supplier_id) {
                       setFormData({ ...formData, supplier_id: value });
                     }
                   }}
                   disabled={!isInitialized || suppliers.length === 0}
                 >
                  <SelectTrigger>
                    <SelectValue placeholder={isInitialized ? "Selecione um fornecedor" : "Carregando..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowNewSupplier(true)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="space-y-4 border rounded-lg p-4">
                <div className="space-y-2">
                  <Label htmlFor="supplier_name">Nome *</Label>
                  <Input
                    id="supplier_name"
                    placeholder="Nome do fornecedor"
                    value={supplierFormData.name}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cpf_cnpj">CPF/CNPJ</Label>
                  <Input
                    id="cpf_cnpj"
                    placeholder="000.000.000-00 ou 00.000.000/0000-00"
                    value={supplierFormData.cpf_cnpj}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, cpf_cnpj: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Fatura enviada por:</Label>
                  <div className="flex items-center space-x-6">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="invoice_email"
                        checked={supplierFormData.invoice_sent_by_email}
                        onCheckedChange={(checked) =>
                          setSupplierFormData({ ...supplierFormData, invoice_sent_by_email: checked === true })
                        }
                      />
                      <Label htmlFor="invoice_email" className="font-normal cursor-pointer">
                        E-mail
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="invoice_portal"
                        checked={supplierFormData.invoice_sent_by_portal}
                        onCheckedChange={(checked) =>
                          setSupplierFormData({ ...supplierFormData, invoice_sent_by_portal: checked === true })
                        }
                      />
                      <Label htmlFor="invoice_portal" className="font-normal cursor-pointer">
                        Portal
                      </Label>
                    </div>
                  </div>
                </div>

                {supplierFormData.invoice_sent_by_portal && (
                  <div className="space-y-3 border-t pt-3">
                    <div className="space-y-2">
                      <Label htmlFor="portal_url">URL do Portal</Label>
                      <Input
                        id="portal_url"
                        type="url"
                        placeholder="https://portal.exemplo.com.br"
                        value={supplierFormData.portal_url}
                        onChange={(e) => setSupplierFormData({ ...supplierFormData, portal_url: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="portal_login">Login</Label>
                      <Input
                        id="portal_login"
                        placeholder="Login do portal"
                        value={supplierFormData.portal_login}
                        onChange={(e) => setSupplierFormData({ ...supplierFormData, portal_login: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="portal_password">Senha</Label>
                      <Input
                        id="portal_password"
                        type="password"
                        placeholder="Senha do portal"
                        value={supplierFormData.portal_password}
                        onChange={(e) => setSupplierFormData({ ...supplierFormData, portal_password: e.target.value })}
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="supplier_observations">Observações</Label>
                  <Textarea
                    id="supplier_observations"
                    placeholder="Observações sobre o fornecedor"
                    value={supplierFormData.observations}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, observations: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button type="button" onClick={handleAddSupplier}>
                    Adicionar
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowNewSupplier(false);
                      setSupplierFormData({
                        name: "",
                        cpf_cnpj: "",
                        invoice_sent_by_email: false,
                        invoice_sent_by_portal: false,
                        portal_url: "",
                        portal_login: "",
                        portal_password: "",
                        observations: "",
                      });
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              placeholder="Descrição da conta"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Valor</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dia_emissao">Dia de Emissão (1-31)</Label>
              <Input
                id="dia_emissao"
                type="number"
                min="1"
                max="31"
                placeholder="Ex: 5"
                value={formData.dia_emissao}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "" || (parseInt(value) >= 1 && parseInt(value) <= 31)) {
                    setFormData({ ...formData, dia_emissao: value });
                  }
                }}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dia_vencimento">Dia de Vencimento (1-31)</Label>
              <Input
                id="dia_vencimento"
                type="number"
                min="1"
                max="31"
                placeholder="Ex: 7"
                value={formData.dia_vencimento}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "" || (parseInt(value) >= 1 && parseInt(value) <= 31)) {
                    setFormData({ ...formData, dia_vencimento: value });
                  }
                }}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="data_fim">Data Fim (Opcional)</Label>
            <Input
              id="data_fim"
              type="date"
              value={formData.data_fim}
              onChange={(e) => setFormData({ ...formData, data_fim: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Deixe em branco para conta recorrente indefinida
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
