import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import { format, parseISO } from "date-fns";
import { Plus, X } from "lucide-react";

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
  const [isInitialized, setIsInitialized] = useState(false);
  const [costCenters, setCostCenters] = useState<{ code: string; percent: number }[]>([
    { code: "", percent: 100 },
  ]);

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
        
        // Carregar fornecedores ativos
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: activeSuppliers, error: activeError } = await supabase
          .from("suppliers")
          .select("*")
          .eq("user_id", user.id)
          .eq("status", true)
          .order("name");

        if (activeError) {
          console.error("Error loading suppliers:", activeError);
          return;
        }

        // Se a conta tem um fornecedor específico, buscar ele também (mesmo que inativo)
        let allSuppliers = [...(activeSuppliers || [])];
        if (account.supplier_id) {
          const { data: currentSupplier } = await supabase
            .from("suppliers")
            .select("*")
            .eq("id", account.supplier_id)
            .single();

          if (currentSupplier && !activeSuppliers?.find(s => s.id === currentSupplier.id)) {
            allSuppliers.push(currentSupplier);
          }
        }

        setSuppliers(allSuppliers);

        // Aguardar um tick para garantir que o estado foi atualizado
        await new Promise(resolve => setTimeout(resolve, 0));

        // Depois de carregar os suppliers, preencher o formData
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
        // Inicializar centros de custo a partir da conta (se existir)
        const existing = Array.isArray(account.cost_centers) ? account.cost_centers : [];
        if (existing.length > 0) {
          setCostCenters(existing.map((c: any) => ({ code: String(c.code ?? ""), percent: Number(c.percent ?? 0) })));
        } else {
          setCostCenters([{ code: "", percent: 100 }]);
        }
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
        setCostCenters([{ code: "", percent: 100 }]);
      }
    };

    initializeData();
  }, [open, account]);

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

    // Validar centros de custo
    const codeRegex = /^\d{2}\.\d{3}$/;
    const cleaned = costCenters
      .map((c) => ({ code: c.code.trim(), percent: Number(c.percent) }))
      .filter((c) => c.code !== "");

    if (cleaned.length === 0) {
      toast.error("Adicione pelo menos 1 centro de custo");
      return;
    }

    for (const c of cleaned) {
      if (!codeRegex.test(c.code)) {
        toast.error("Código de centro de custo inválido. Use o formato 01.001");
        return;
      }
      if (isNaN(c.percent) || c.percent <= 0) {
        toast.error("Percentual deve ser maior que 0");
        return;
      }
    }

    const total = cleaned.reduce((sum, c) => sum + c.percent, 0);
    if (Math.round(total) !== 100) {
      toast.error("A soma dos percentuais deve ser 100%");
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
        cost_centers: cleaned,
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
                    {supplier.name} {!supplier.status ? "(Inativo)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Centros de Custo</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                const next = [...costCenters, { code: "", percent: 0 }];
                const n = next.length;
                const base = Math.floor(100 / n);
                const remainder = 100 - base * n;
                const distributed = next.map((c, i) => ({
                  code: c.code,
                  percent: base + (i < remainder ? 1 : 0),
                }));
                setCostCenters(distributed);
              }}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {costCenters.map((cc, index) => (
            <div key={index} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-7">
                <Input
                  placeholder="01.001"
                  value={cc.code}
                  onChange={(e) => {
                    const value = e.target.value.trim();
                    const next = [...costCenters];
                    next[index] = { ...next[index], code: value };
                    setCostCenters(next);
                  }}
                />
              </div>
              <div className="col-span-4">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={cc.percent}
                  onChange={(e) => {
                    const num = Number(e.target.value);
                    const next = [...costCenters];
                    next[index] = { ...next[index], percent: isNaN(num) ? 0 : num };
                    setCostCenters(next);
                  }}
                />
              </div>
              <div className="col-span-1 flex justify-end">
                {costCenters.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      const next = costCenters.filter((_, i) => i !== index);
                      if (next.length === 0) {
                        setCostCenters([{ code: "", percent: 100 }]);
                        return;
                      }
                      const n = next.length;
                      const base = Math.floor(100 / n);
                      const remainder = 100 - base * n;
                      const distributed = next.map((c, i) => ({
                        code: c.code,
                        percent: base + (i < remainder ? 1 : 0),
                      }));
                      setCostCenters(distributed);
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}

          <div className="text-xs text-muted-foreground">
            Total: {costCenters.reduce((s, c) => s + Number(c.percent || 0), 0)}%
          </div>
          <p className="text-xs text-muted-foreground">Formato do código: 01.001. Ajuste os percentuais conforme necessário (total 100%).</p>
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
