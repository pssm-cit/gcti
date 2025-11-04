import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { format } from "date-fns";

interface MarkDeliveredDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: any;
  onSuccess: () => void;
}

export function MarkDeliveredDialog({ open, onOpenChange, account, onSuccess }: MarkDeliveredDialogProps) {
  const [loading, setLoading] = useState(false);
  const [invoiceNumbers, setInvoiceNumbers] = useState<string[]>([""]);
  const [recipient, setRecipient] = useState("");

  const addInvoiceField = () => {
    setInvoiceNumbers([...invoiceNumbers, ""]);
  };

  const removeInvoiceField = (index: number) => {
    setInvoiceNumbers(invoiceNumbers.filter((_, i) => i !== index));
  };

  const updateInvoiceNumber = (index: number, value: string) => {
    const newInvoices = [...invoiceNumbers];
    newInvoices[index] = value;
    setInvoiceNumbers(newInvoices);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validInvoices = invoiceNumbers.filter(n => n.trim() !== "");
    
    if (validInvoices.length === 0) {
      toast.error("Informe pelo menos um número de nota fiscal");
      return;
    }

    if (!recipient.trim()) {
      toast.error("Informe o destinatário");
      return;
    }

    setLoading(true);

    const currentMonth = format(new Date(), "yyyy-MM");
    const currentDate = format(new Date(), "yyyy-MM-dd");

    // Obter user_id
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Erro: usuário não autenticado");
      setLoading(false);
      return;
    }

    // Atualizar conta
    const { error: updateError } = await supabase
      .from("accounts")
      .update({
        is_delivered: true,
        delivered_at: new Date().toISOString(),
        invoice_numbers: validInvoices,
        recipient: recipient,
        last_paid_month: currentMonth,
      })
      .eq("id", account.id);

    if (updateError) {
      toast.error("Erro ao marcar como entregue");
      console.error(updateError);
      setLoading(false);
      return;
    }

    // Salvar no histórico de pagamentos
    const { error: historyError } = await supabase
      .from("account_payment_history")
      .insert({
        account_id: account.id,
        user_id: user.id,
        paid_month: currentMonth,
        paid_date: currentDate,
        invoice_numbers: validInvoices,
        recipient: recipient,
        amount: account.amount,
      });

    if (historyError) {
      console.error("Erro ao salvar histórico de pagamento:", historyError);
      // Não bloquear a operação se o histórico falhar, mas logar o erro
    }

    setLoading(false);

    toast.success("Fatura marcada como paga!");
    onSuccess();
    onOpenChange(false);
    setInvoiceNumbers([""]);
    setRecipient("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Marcar como Entregue</DialogTitle>
          <DialogDescription>
            Informe os dados da entrega
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Número(s) da Nota Fiscal</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={addInvoiceField}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            
            {invoiceNumbers.map((invoice, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  placeholder={`NF ${index + 1}`}
                  value={invoice}
                  onChange={(e) => updateInvoiceNumber(index, e.target.value)}
                />
                {invoiceNumbers.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeInvoiceField(index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="recipient">Destinatário</Label>
            <Input
              id="recipient"
              placeholder="Nome do destinatário"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              required
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Confirmar Entrega"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
