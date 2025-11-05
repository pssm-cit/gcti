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
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const currentMonthStr = format(now, "yyyy-MM");

    // Helper para calcular vencimento para um mês/ano informados
    const computeDueDate = (year: number, monthIndex0Based: number, dueDay: number) => {
      const daysInMonth = new Date(year, monthIndex0Based + 1, 0).getDate();
      const actualDueDay = Math.min(parseInt(String(dueDay)) || 1, daysInMonth);
      return new Date(year, monthIndex0Based, actualDueDay);
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
      .or(`data_fim.is.null,data_fim.gte.${today}`)
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

    // Expandir contas em cards para todos os meses desde criação até hoje
    const baseAccounts = accountsData || [];
    const expandedAccounts: any[] = [];

    for (const account of baseAccounts) {
      const createdAt = account.created_at ? new Date(account.created_at) : new Date();
      const createdMonth = new Date(createdAt.getFullYear(), createdAt.getMonth(), 1);
      const endDate = account.data_fim ? new Date(account.data_fim) : null;
      const endMonth = endDate ? new Date(endDate.getFullYear(), endDate.getMonth(), 1) : null;
      const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Obter meses pagos para esta conta
      const paidMonths = paidMonthsMap.get(account.id) || new Set<string>();

      // Gerar cards para cada mês desde criação até hoje (ou data_fim)
      let monthCursor = new Date(createdMonth);
      while (monthCursor <= currentMonth && (!endMonth || monthCursor <= endMonth)) {
        const monthStr = format(monthCursor, "yyyy-MM");
        
        // Pular meses já pagos
        if (!paidMonths.has(monthStr)) {
          const dueDate = computeDueDate(
            monthCursor.getFullYear(),
            monthCursor.getMonth(),
            account.dia_vencimento
          );
          
          const issueDate = computeIssueDate(
            monthCursor.getFullYear(),
            monthCursor.getMonth(),
            account.dia_emissao
          );
          
          const isPreviousMonth = monthStr < currentMonthStr;
          
          expandedAccounts.push({
            ...account,
            __dueDate: dueDate.toISOString(),
            __issueDate: issueDate.toISOString(),
            __period: monthStr,
            __isPreviousMonth: isPreviousMonth,
            __isPaid: false
          });
        } else {
          // Meses pagos aparecem como entregues
          const dueDate = computeDueDate(
            monthCursor.getFullYear(),
            monthCursor.getMonth(),
            account.dia_vencimento
          );
          
          const issueDate = computeIssueDate(
            monthCursor.getFullYear(),
            monthCursor.getMonth(),
            account.dia_emissao
          );
          
          // Buscar dados do pagamento no histórico
          const paymentData = paymentHistory?.find(
            (p: any) => p.account_id === account.id && p.paid_month === monthStr
          );
          
          expandedAccounts.push({
            ...account,
            __dueDate: dueDate.toISOString(),
            __issueDate: issueDate.toISOString(),
            __period: monthStr,
            __isPreviousMonth: monthStr < currentMonthStr,
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

    // Identificar pendências de meses anteriores: período < mês atual
    const previousMonthPendencies = pendingAccounts.filter(acc => acc.__period && acc.__period < currentMonthStr);

    // Pendências do mês atual: período == mês atual
    const currentMonthPendencies = pendingAccounts.filter(acc => acc.__period === currentMonthStr);

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
            {/* Pendências de meses anteriores */}
            {accounts.filter(acc => {
              const currentMonth = format(new Date(), "yyyy-MM");
              return !acc.__isPaid && acc.__period && acc.__period < currentMonth;
            }).length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4 text-destructive">
                  ⚠️ Pendências de meses anteriores
                </h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {accounts
                    .filter(acc => {
                      const currentMonth = format(new Date(), "yyyy-MM");
                      return !acc.__isPaid && acc.__period && acc.__period < currentMonth;
                    })
                    .map((account, index) => (
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
            {accounts.filter(acc => {
              const currentMonth = format(new Date(), "yyyy-MM");
              return !acc.__isPaid && acc.__period === currentMonth;
            }).length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4">
                  Pendentes
                </h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {accounts
                    .filter(acc => {
                      const currentMonth = format(new Date(), "yyyy-MM");
                      return !acc.__isPaid && acc.__period === currentMonth;
                    })
                    .map((account, index) => (
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
            {accounts.filter(acc => acc.__isPaid).length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4 text-muted-foreground">
                  Entregues
                </h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {accounts
                    .filter(acc => acc.__isPaid)
                    .map((account, index) => (
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
