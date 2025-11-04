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
    const currentMonth = format(new Date(), "yyyy-MM");
    
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

    // Separar contas em pendentes e entregues
    const pendingAccounts = (data || []).filter(account => !account.is_delivered);
    const deliveredAccounts = (data || []).filter(account => account.is_delivered);

    // Identificar pendências de meses anteriores
    // Uma conta é pendência de mês anterior se:
    // - Não foi entregue E last_paid_month IS NOT NULL E last_paid_month < mês atual
    // (Ou seja, foi paga antes mas não foi paga este mês)
    const previousMonthPendencies = pendingAccounts.filter(account => {
      return account.last_paid_month && account.last_paid_month < currentMonth;
    });

    // Pendências do mês atual: todas as outras pendentes (nunca pagas ou resetadas)
    const currentMonthPendencies = pendingAccounts.filter(account => 
      !previousMonthPendencies.includes(account)
    );

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
              return !acc.is_delivered && (acc.last_paid_month === null || acc.last_paid_month < currentMonth);
            }).length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4 text-destructive">
                  ⚠️ Pendências de meses anteriores
                </h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {accounts
                    .filter(acc => {
                      const currentMonth = format(new Date(), "yyyy-MM");
                      return !acc.is_delivered && (acc.last_paid_month === null || acc.last_paid_month < currentMonth);
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
              return !acc.is_delivered && acc.last_paid_month === currentMonth;
            }).length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4">
                  Pendentes do mês atual
                </h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {accounts
                    .filter(acc => {
                      const currentMonth = format(new Date(), "yyyy-MM");
                      return !acc.is_delivered && acc.last_paid_month === currentMonth;
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
                  Entregues/Pagas
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
