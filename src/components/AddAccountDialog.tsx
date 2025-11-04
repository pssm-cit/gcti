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
import { format } from "date-fns";

const accountSchema = z.object({
  supplier_id: z.string().min(1, "Selecione um fornecedor"),
  description: z.string().min(3, "Descrição deve ter pelo menos 3 caracteres").max(200),
  amount: z.number().positive("Valor deve ser maior que zero"),
  dia_emissao: z.number().min(1, "Dia de emissão deve ser entre 1 e 31").max(31),
  dia_vencimento: z.number().min(1, "Dia de vencimento deve ser entre 1 e 31").max(31),
  data_fim: z.string().optional(),
});

interface AddAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddAccountDialog({ open, onOpenChange, onSuccess }: AddAccountDialogProps) {
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [showNewSupplier, setShowNewSupplier] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState("");

  const [formData, setFormData] = useState({
    supplier_id: "",
    description: "",
    amount: "",
    dia_emissao: new Date().getDate().toString(),
    dia_vencimento: (new Date().getDate() + 2).toString(),
    data_fim: "",
  });

  useEffect(() => {
    if (open) {
      loadSuppliers();
    }
  }, [open]);

  const loadSuppliers = async () => {
    const { data, error } = await supabase
      .from("suppliers")
      .select("*")
      .order("name");

    if (error) {
      console.error("Error loading suppliers:", error);
      return;
    }

    setSuppliers(data || []);
  };

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
      dia_emissao: parseInt(formData.dia_emissao),
      dia_vencimento: parseInt(formData.dia_vencimento),
      data_fim: formData.data_fim || undefined,
    });

    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }

    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("accounts").insert([{
      user_id: user.id,
      supplier_id: formData.supplier_id,
      description: formData.description,
      amount: parseFloat(formData.amount),
      dia_emissao: parseInt(formData.dia_emissao),
      dia_vencimento: parseInt(formData.dia_vencimento),
      data_fim: formData.data_fim || null,
    }]);

    setLoading(false);

    if (error) {
      toast.error("Erro ao cadastrar conta");
      console.error(error);
      return;
    }

    toast.success("Conta recorrente cadastrada com sucesso!");
    onSuccess();
    onOpenChange(false);
    setFormData({
      supplier_id: "",
      description: "",
      amount: "",
      dia_emissao: new Date().getDate().toString(),
      dia_vencimento: (new Date().getDate() + 2).toString(),
      data_fim: "",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Conta</DialogTitle>
          <DialogDescription>
            Cadastre uma nova conta a pagar
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Fornecedor</Label>
            {!showNewSupplier ? (
              <div className="flex gap-2">
                <Select
                  value={formData.supplier_id}
                  onValueChange={(value) => setFormData({ ...formData, supplier_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um fornecedor" />
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
