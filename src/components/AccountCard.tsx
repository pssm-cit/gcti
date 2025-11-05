import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Calendar, DollarSign, Building2, FileText } from "lucide-react";
import { useState } from "react";
import { MarkDeliveredDialog } from "./MarkDeliveredDialog";
import { EditAccountDialog } from "./EditAccountDialog";
import { format, isPast, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AccountCardProps {
  account: any;
  onUpdate: () => void;
}

export function AccountCard({ account, onUpdate }: AccountCardProps) {
  const [markDeliveredDialogOpen, setMarkDeliveredDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  
  // Calcular data de vencimento; usa override (__dueDate) se fornecido
  const getCurrentMonthDueDate = () => {
    if (account.__dueDate) {
      return new Date(account.__dueDate);
    }
    if (!account.dia_vencimento) {
      // Fallback para contas antigas que ainda usam due_date
      return account.due_date ? new Date(account.due_date) : new Date();
    }
    
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const dueDay = parseInt(account.dia_vencimento) || 1;
    
    // Criar data de vencimento no mês atual
    // Usar o último dia do mês se dia_vencimento for maior que os dias do mês
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const actualDueDay = Math.min(dueDay, daysInMonth);
    
    return new Date(currentYear, currentMonth, actualDueDay);
  };

  // Calcular data de emissão; usa override (__issueDate) se fornecido
  const getCurrentMonthIssueDate = () => {
    if (account.__issueDate) {
      return new Date(account.__issueDate);
    }
    if (!account.dia_emissao) {
      // Fallback para contas antigas
      return account.issue_date ? new Date(account.issue_date) : new Date();
    }
    
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const issueDay = parseInt(account.dia_emissao) || 1;
    
    // Criar data de emissão no mês atual
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const actualIssueDay = Math.min(issueDay, daysInMonth);
    
    return new Date(currentYear, currentMonth, actualIssueDay);
  };
  
  const dueDate = getCurrentMonthDueDate();
  const issueDate = getCurrentMonthIssueDate();
  const isPaid = account.__isPaid === true;
  const isOverdue = isPast(dueDate) && !isToday(dueDate) && !isPaid;
  const isDueToday = isToday(dueDate) && !isPaid;

  const getStatusBadge = () => {
    if (isPaid) {
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

  const handleCardClick = (e: React.MouseEvent) => {
    // Não abrir o diálogo se clicar no botão ou em elementos interativos
    const target = e.target as HTMLElement;
    if (target.closest('button')) {
      return;
    }
    setEditDialogOpen(true);
  };

  const handleButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevenir que o clique no botão abra o diálogo de edição
    setMarkDeliveredDialogOpen(true);
  };

  return (
    <>
      <Card 
        className="transition-all hover:shadow-lg cursor-pointer" 
        onClick={handleCardClick}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Building2 className="w-4 h-4" />
                {account.suppliers?.name}
              </div>
              {account.__period && (
                <div className="text-xs text-muted-foreground font-medium">
                  {format(new Date(account.__period + "-01"), "MMMM 'de' yyyy", { locale: ptBR })}
                </div>
              )}
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
            <FileText className="w-4 h-4" />
            <span>
              Emissão: {format(issueDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </span>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>
              Vencimento: {format(dueDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </span>
          </div>

          {account.data_fim && (
            <div className="text-xs text-muted-foreground">
              Data fim: {format(new Date(account.data_fim), "dd/MM/yyyy")}
            </div>
          )}
        </CardContent>

        {!isPaid && (
          <CardFooter>
            <Button 
              className="w-full" 
              variant="outline"
              onClick={handleButtonClick}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Marcar como Entregue
            </Button>
          </CardFooter>
        )}

        {isPaid && account.invoice_numbers && (
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
        open={markDeliveredDialogOpen}
        onOpenChange={setMarkDeliveredDialogOpen}
        account={account}
        onSuccess={onUpdate}
      />
      <EditAccountDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        account={account}
        onSuccess={onUpdate}
      />
    </>
  );
}
