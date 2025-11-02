import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Calendar, DollarSign, Building2 } from "lucide-react";
import { useState } from "react";
import { MarkDeliveredDialog } from "./MarkDeliveredDialog";
import { format, parseISO, isPast, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AccountCardProps {
  account: any;
  onUpdate: () => void;
}

export function AccountCard({ account, onUpdate }: AccountCardProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const dueDate = parseISO(account.due_date);
  const isOverdue = isPast(dueDate) && !isToday(dueDate) && !account.is_delivered;
  const isDueToday = isToday(dueDate) && !account.is_delivered;

  const getStatusBadge = () => {
    if (account.is_delivered) {
      return <Badge className="bg-success text-success-foreground">Entregue</Badge>;
    }
    if (isOverdue) {
      return <Badge className="bg-destructive text-destructive-foreground">Vencida</Badge>;
    }
    if (isDueToday) {
      return <Badge className="bg-warning text-warning-foreground">Vence Hoje</Badge>;
    }
    return <Badge variant="secondary">Pendente</Badge>;
  };

  return (
    <>
      <Card className="transition-all hover:shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="w-4 h-4" />
              {account.suppliers?.name}
            </div>
            {getStatusBadge()}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-3">
          <h3 className="font-semibold text-lg">{account.description}</h3>
          
          <div className="flex items-center gap-2 text-muted-foreground">
            <DollarSign className="w-4 h-4" />
            <span className="font-medium">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              }).format(account.amount)}
            </span>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>
              Vencimento: {format(dueDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </span>
          </div>

          {account.end_date && (
            <div className="text-xs text-muted-foreground">
              Data fim: {format(parseISO(account.end_date), "dd/MM/yyyy")}
            </div>
          )}
        </CardContent>

        {!account.is_delivered && (
          <CardFooter>
            <Button 
              className="w-full" 
              variant="outline"
              onClick={() => setDialogOpen(true)}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Marcar como Entregue
            </Button>
          </CardFooter>
        )}

        {account.is_delivered && account.invoice_numbers && (
          <CardFooter className="flex-col items-start">
            <p className="text-xs text-muted-foreground mb-1">
              NF: {account.invoice_numbers.join(", ")}
            </p>
            {account.recipient && (
              <p className="text-xs text-muted-foreground">
                Destinatário: {account.recipient}
              </p>
            )}
          </CardFooter>
        )}
      </Card>

      <MarkDeliveredDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        account={account}
        onSuccess={onUpdate}
      />
    </>
  );
}
