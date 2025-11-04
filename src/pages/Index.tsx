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

    // Carregar todas as contas que devem aparecer (data_fim NULL ou >= hoje)
    const { data, error } = await supabase
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

    if (error) {
      toast.error("Erro ao carregar contas");
      console.error(error);
      return;
    }

    // Expandir contas pendentes em cartões "virtuais" para mês anterior e mês atual, quando aplicável
    const baseAccounts = data || [];
    const expandedAccounts: any[] = [];

    for (const account of baseAccounts) {
      if (!account.is_delivered) {
        // Card do mês atual
        const currentDueDate = computeDueDate(now.getFullYear(), now.getMonth(), account.dia_vencimento);
        expandedAccounts.push({ ...account, __dueDate: currentDueDate.toISOString(), __period: currentMonthStr });

        // Card do mês anterior, se a recorrência já existia no mês anterior
        const createdAt = account.created_at ? new Date(account.created_at) : null;
        const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const hadPreviousCycle = createdAt ? createdAt < startOfCurrentMonth : true;
        const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const prevMonthStr = format(prev, "yyyy-MM");
        if (hadPreviousCycle) {
          const prevDueDate = computeDueDate(prev.getFullYear(), prev.getMonth(), account.dia_vencimento);
          expandedAccounts.push({ ...account, __dueDate: prevDueDate.toISOString(), __period: prevMonthStr, __isPreviousMonth: true });
        }
      } else {
        // Entregues permanecem como 1 card (sem duplicar)
        expandedAccounts.push(account);
      }
    }

    // Separar após expansão
    const pendingAccounts = expandedAccounts.filter(acc => !acc.is_delivered);
    const deliveredAccounts = expandedAccounts.filter(acc => acc.is_delivered);

    // Identificar pendências de meses anteriores: os virtuais marcados ou período < mês atual
    const previousMonthPendencies = pendingAccounts.filter(acc => acc.__isPreviousMonth || (acc.__period && acc.__period < currentMonthStr));

    // Pendências do mês atual: período == mês atual
    const currentMonthPendencies = pendingAccounts.filter(acc => acc.__period === currentMonthStr);

    // Ordenar por dia_vencimento
    const sortByDueDay = (a: any, b: any) => {
      const dayA = parseInt(a.dia_vencimento) || 31;
      const dayB = parseInt(b.dia_vencimento) || 31;
      return dayA - dayB;
    };

    previousMonthPendencies.sort(sortByDueDay);
    currentMonthPendencies.sort(sortByDueDay);
    deliveredAccounts.sort(sortByDueDay);

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
            Nova Fatura Recorrente
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
              return !acc.is_delivered && acc.last_paid_month && acc.last_paid_month < currentMonth;
            }).length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4 text-destructive">
                  ⚠️ Pendências de meses anteriores
                </h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {accounts
                    .filter(acc => {
                      const currentMonth = format(new Date(), "yyyy-MM");
                      return !acc.is_delivered && acc.last_paid_month && acc.last_paid_month < currentMonth;
                    })
                    .map((account) => (
                      <AccountCard 
                        key={account.id} 
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
              return !acc.is_delivered && (!acc.last_paid_month || acc.last_paid_month === currentMonth);
            }).length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4">
                  Pendentes do mês atual
                </h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {accounts
                    .filter(acc => {
                      const currentMonth = format(new Date(), "yyyy-MM");
                      return !acc.is_delivered && (!acc.last_paid_month || acc.last_paid_month === currentMonth);
                    })
                    .map((account) => (
                      <AccountCard 
                        key={account.id} 
                        account={account}
                        onUpdate={loadAccounts}
                      />
                    ))}
                </div>
              </div>
            )}

            {/* Faturas entregues */}
            {accounts.filter(acc => acc.is_delivered).length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4 text-muted-foreground">
                  Entregues
                </h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {accounts
                    .filter(acc => acc.is_delivered)
                    .map((account) => (
                      <AccountCard 
                        key={account.id} 
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
