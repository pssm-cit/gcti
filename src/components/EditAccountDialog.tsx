import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { z } from "zod";
import { addBusinessDays, format, parseISO } from "date-fns";

const accountSchema = z.object({
  supplier_id: z.string().min(1, "Selecione um fornecedor"),
  description: z.string().min(3, "Descrição deve ter pelo menos 3 caracteres").max(200),
  amount: z.number().positive("Valor deve ser maior que zero"),
  issue_date: z.string().min(1, "Data de emissão é obrigatória"),
  end_date: z.string().optional(),
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
  const [newSupplierName, setNewSupplierName] = useState("");
  const [isInitialized, setIsInitialized] = useState(false);

  const [formData, setFormData] = useState({
    supplier_id: "",
    description: "",
    amount: "",
    issue_date: format(new Date(), "yyyy-MM-dd"),
    end_date: "",
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
        // Tratar datas que podem vir como string ISO ou formato YYYY-MM-DD
        const issueDate = account.issue_date 
          ? (account.issue_date.includes('T') 
              ? format(parseISO(account.issue_date), "yyyy-MM-dd")
              : account.issue_date.split('T')[0])
          : format(new Date(), "yyyy-MM-dd");
        const endDate = account.end_date 
          ? (account.end_date.includes('T') 
              ? format(parseISO(account.end_date), "yyyy-MM-dd")
              : account.end_date.split('T')[0])
          : "";
        
        const newFormData = {
          supplier_id: account.supplier_id || "",
          description: account.description || "",
          amount: account.amount?.toString() || "",
          issue_date: issueDate,
          end_date: endDate,
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
          issue_date: format(new Date(), "yyyy-MM-dd"),
          end_date: "",
        });
        setSuppliers([]);
      }
    };

    initializeData();
  }, [open, account]);

  const handleAddSupplier = async () => {
    if (!newSupplierName.trim()) {
      toast.error("Digite um nome para o fornecedor");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("suppliers")
      .insert([{ name: newSupplierName, user_id: user.id }])
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
    setNewSupplierName("");
    setShowNewSupplier(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = accountSchema.safeParse({
      ...formData,
      amount: parseFloat(formData.amount),
      end_date: formData.end_date || undefined,
    });

    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }

    setLoading(true);

    // Calcular data de vencimento (2 dias úteis)
    const issueDate = new Date(formData.issue_date);
    const dueDate = addBusinessDays(issueDate, 2);

    const { error } = await supabase
      .from("accounts")
      .update({
        supplier_id: formData.supplier_id,
        description: formData.description,
        amount: parseFloat(formData.amount),
        issue_date: formData.issue_date,
        due_date: format(dueDate, "yyyy-MM-dd"),
        end_date: formData.end_date || null,
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
              <div className="flex gap-2">
                <Input
                  placeholder="Nome do fornecedor"
                  value={newSupplierName}
                  onChange={(e) => setNewSupplierName(e.target.value)}
                />
                <Button type="button" onClick={handleAddSupplier}>
                  Adicionar
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowNewSupplier(false)}
                >
                  Cancelar
                </Button>
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
              <Label htmlFor="issue_date">Data de Emissão</Label>
              <Input
                id="issue_date"
                type="date"
                value={formData.issue_date}
                onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_date">Data Fim (Opcional)</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              />
            </div>
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
