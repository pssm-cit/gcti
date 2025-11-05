import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { AddAccountDialog } from "@/components/AddAccountDialog";
import { AccountCard } from "@/components/AccountCard";
import type { Session } from "@supabase/supabase-js";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Index() {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [previousMonthPendencies, setPreviousMonthPendencies] = useState<any[]>([]);
  const [currentMonthPendencies, setCurrentMonthPendencies] = useState<any[]>([]);
  const [deliveredAccounts, setDeliveredAccounts] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (session) {
      loadAccounts();
      
      // Verificar e resetar status quando necessário (ao montar e ao mudar de mês)
      resetRecurringAccountsStatus();
    }
  }, [session]);

  // Função para resetar status de contas recorrentes quando mudar de mês
  const resetRecurringAccountsStatus = async () => {
    try {
      // Chamar a função do banco de dados que reseta o status
      const { error } = await supabase.rpc('reset_recurring_accounts_status');
      
      if (error) {
        console.error("Erro ao resetar status de contas recorrentes:", error);
      }
    } catch (error) {
      console.error("Erro ao resetar status:", error);
    }
  };

  const loadAccounts = async () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const now = new Date();
    const currentMonthStr = format(now, "yyyy-MM");

    // Helper para calcular vencimento para um mês/ano informados
    // Se dia_emissao > dia_vencimento, o vencimento é do mês seguinte
    const computeDueDate = (year: number, monthIndex0Based: number, dueDay: number, issueDay: number) => {
      let dueYear = year;
      let dueMonth = monthIndex0Based;
      
      // Se dia de emissão > dia de vencimento, vencimento é do mês seguinte
      if (issueDay > dueDay) {
        dueMonth = dueMonth + 1;
        if (dueMonth > 11) {
          dueMonth = 0;
          dueYear = dueYear + 1;
        }
      }
      
      const daysInMonth = new Date(dueYear, dueMonth + 1, 0).getDate();
      const actualDueDay = Math.min(parseInt(String(dueDay)) || 1, daysInMonth);
      return new Date(dueYear, dueMonth, actualDueDay);
    };

    // Helper para calcular data de emissão para um mês/ano informados
    const computeIssueDate = (year: number, monthIndex0Based: number, issueDay: number) => {
      const daysInMonth = new Date(year, monthIndex0Based + 1, 0).getDate();
      const actualIssueDay = Math.min(parseInt(String(issueDay)) || 1, daysInMonth);
      return new Date(year, monthIndex0Based, actualIssueDay);
    };

    // Carregar todas as contas que devem aparecer (data_fim NULL ou >= hoje)
    const { data: accountsData, error: accountsError } = await supabase
      .from("accounts")
      .select(`
        *,
        suppliers (
          id,
          name
        )
      `)
      .or(`data_fim.is.null,data_fim.gte.${todayStr}`)
      .order("dia_vencimento", { ascending: true });

    if (accountsError) {
      toast.error("Erro ao carregar contas");
      console.error(accountsError);
      return;
    }

    // Carregar histórico de pagamentos para filtrar meses já pagos
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: paymentHistory, error: historyError } = await supabase
      .from("account_payment_history")
      .select("account_id, paid_month, invoice_numbers, recipient, paid_date")
      .eq("user_id", user.id);

    if (historyError) {
      console.error("Erro ao carregar histórico de pagamentos:", historyError);
    }

    // Criar mapa de meses pagos por conta: account_id -> Set de meses pagos
    const paidMonthsMap = new Map<string, Set<string>>();
    if (paymentHistory) {
      paymentHistory.forEach((payment: any) => {
        if (!paidMonthsMap.has(payment.account_id)) {
          paidMonthsMap.set(payment.account_id, new Set());
        }
        paidMonthsMap.get(payment.account_id)?.add(payment.paid_month);
      });
    }

    // Expandir contas em cards baseado na data de emissão
    const baseAccounts = accountsData || [];
    const expandedAccounts: any[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Set para evitar duplicatas durante a criação: account_id + paidMonthKey
    const createdKeys = new Set<string>();

    for (const account of baseAccounts) {
      const createdAt = account.created_at ? new Date(account.created_at) : new Date();
      const createdMonth = new Date(createdAt.getFullYear(), createdAt.getMonth(), 1);
      const endDate = account.data_fim ? new Date(account.data_fim) : null;
      const endMonth = endDate ? new Date(endDate.getFullYear(), endDate.getMonth(), 1) : null;
      const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Obter meses pagos para esta conta
      const paidMonths = paidMonthsMap.get(account.id) || new Set<string>();

      // Gerar cards baseado na data de emissão
      // Começar do mês de criação até o mês atual (ou data_fim)
      let monthCursor = new Date(createdMonth);
      while (monthCursor <= currentMonth && (!endMonth || monthCursor <= endMonth)) {
        const monthStr = format(monthCursor, "yyyy-MM");
        
        // Calcular data de emissão para este mês
        const issueDate = computeIssueDate(
          monthCursor.getFullYear(),
          monthCursor.getMonth(),
          account.dia_emissao
        );
        
        // Calcular data de vencimento (pode ser do mês seguinte se dia_emissao > dia_vencimento)
        const dueDate = computeDueDate(
          monthCursor.getFullYear(),
          monthCursor.getMonth(),
          account.dia_vencimento,
          account.dia_emissao
        );
        
        // Verificar se este card deve ser exibido baseado na data de emissão
        // Card deve aparecer quando a data de emissão já passou ou está no mês atual
        const issueDateOnly = new Date(issueDate.getFullYear(), issueDate.getMonth(), issueDate.getDate());
        const shouldShow = issueDateOnly <= today || format(issueDate, "yyyy-MM") === currentMonthStr;
        
        if (!shouldShow) {
          // Avançar para o próximo mês
          monthCursor = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1);
          continue;
        }
        
        // Verificar se este mês já foi pago
        const paidMonthKey = format(issueDate, "yyyy-MM");
        const uniqueKey = `${account.id}-${paidMonthKey}`;
        
        // Verificar se já criamos este card (evitar duplicatas)
        if (createdKeys.has(uniqueKey)) {
          monthCursor = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1);
          continue;
        }
        createdKeys.add(uniqueKey);
        
        if (!paidMonths.has(paidMonthKey)) {
          const isPreviousMonth = issueDateOnly < today && format(issueDate, "yyyy-MM") < currentMonthStr;
          
          expandedAccounts.push({
            ...account,
            __dueDate: dueDate.toISOString(),
            __issueDate: issueDate.toISOString(),
            __period: paidMonthKey,
            __isPreviousMonth: isPreviousMonth,
            __isPaid: false
          });
        } else {
          // Mês pago aparece como entregue
          const paymentData = paymentHistory?.find(
            (p: any) => p.account_id === account.id && p.paid_month === paidMonthKey
          );
          
          expandedAccounts.push({
            ...account,
            __dueDate: dueDate.toISOString(),
            __issueDate: issueDate.toISOString(),
            __period: paidMonthKey,
            __isPreviousMonth: format(issueDate, "yyyy-MM") < currentMonthStr,
            __isPaid: true,
            invoice_numbers: paymentData?.invoice_numbers || account.invoice_numbers,
            recipient: paymentData?.recipient || account.recipient,
            delivered_at: paymentData?.paid_date || account.delivered_at
          });
        }

        // Avançar para o próximo mês
        monthCursor = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1);
      }
    }

    // Separar após expansão
    const pendingAccounts = expandedAccounts.filter(acc => !acc.__isPaid);
    const deliveredAccounts = expandedAccounts.filter(acc => acc.__isPaid);

    // Criar um Set para evitar duplicatas baseado em account.id + __period
    const seenKeys = new Set<string>();
    const uniquePendingAccounts = pendingAccounts.filter(acc => {
      const key = `${acc.id}-${acc.__period}`;
      if (seenKeys.has(key)) {
        return false;
      }
      seenKeys.add(key);
      return true;
    });

    // Identificar pendências de entrega: data de emissão passada e não paga
    const previousMonthPendencies = uniquePendingAccounts.filter(acc => {
      if (!acc.__issueDate) return false;
      const issueDate = new Date(acc.__issueDate);
      issueDate.setHours(0, 0, 0, 0);
      const todayDate = new Date();
      todayDate.setHours(0, 0, 0, 0);
      return issueDate < todayDate;
    });

    // Pendências do mês atual: data de emissão é hoje ou no futuro próximo
    // Excluir as que já estão em previousMonthPendencies
    const currentMonthPendencies = uniquePendingAccounts.filter(acc => {
      if (!acc.__issueDate) return false;
      const issueDate = new Date(acc.__issueDate);
      issueDate.setHours(0, 0, 0, 0);
      const todayDate = new Date();
      todayDate.setHours(0, 0, 0, 0);
      // Não incluir se já está em previousMonthPendencies
      const isPrevious = issueDate < todayDate;
      return !isPrevious;
    });

    // Ordenar por data de emissão
    const sortByIssueDate = (a: any, b: any) => {
      const issueDateA = a.__issueDate ? new Date(a.__issueDate).getTime() : 0;
      const issueDateB = b.__issueDate ? new Date(b.__issueDate).getTime() : 0;
      return issueDateA - issueDateB;
    };

    previousMonthPendencies.sort(sortByIssueDate);
    currentMonthPendencies.sort(sortByIssueDate);
    deliveredAccounts.sort((a, b) => {
      // Ordenar entregues por período e depois por data de emissão (mais recente primeiro)
      if (a.__period && b.__period) {
        const periodCompare = b.__period.localeCompare(a.__period);
        if (periodCompare !== 0) return periodCompare;
      }
      return sortByIssueDate(a, b);
    });

    // Armazenar separadamente para uso no render
    setPreviousMonthPendencies(previousMonthPendencies);
    setCurrentMonthPendencies(currentMonthPendencies);
    setDeliveredAccounts(deliveredAccounts);
    
    // Combinar: pendências anteriores primeiro, depois pendências do mês atual, depois entregues
    const sortedAccounts = [
      ...previousMonthPendencies,
      ...currentMonthPendencies,
      ...deliveredAccounts
    ];

    setAccounts(sortedAccounts);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold mb-2">Dashboard</h2>
            <p className="text-muted-foreground">
              Faturas do mês de {format(new Date(), "MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>
          
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Conta
          </Button>
        </div>

        {accounts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              Nenhuma fatura cadastrada ainda
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Cadastrar Primeira Fatura
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Pendências de entrega */}
            {previousMonthPendencies.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4 text-destructive">
                  ⚠️ Pendências de entrega
                </h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {previousMonthPendencies.map((account, index) => (
                    <AccountCard 
                      key={`${account.id}-${account.__period}-${index}`} 
                      account={account}
                      onUpdate={loadAccounts}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Pendências do mês atual */}
            {currentMonthPendencies.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4">
                  Futuros a receber
                </h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {currentMonthPendencies.map((account, index) => (
                    <AccountCard 
                      key={`${account.id}-${account.__period}-${index}`} 
                      account={account}
                      onUpdate={loadAccounts}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Faturas entregues */}
            {deliveredAccounts.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4 text-muted-foreground">
                  Entregues
                </h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {deliveredAccounts.map((account, index) => (
                    <AccountCard 
                      key={`${account.id}-${account.__period}-${index}`} 
                      account={account}
                      onUpdate={loadAccounts}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <AddAccountDialog 
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={loadAccounts}
      />
    </div>
  );
}
