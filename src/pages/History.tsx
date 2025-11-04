import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function History() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [filteredAccounts, setFilteredAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [monthFilter, setMonthFilter] = useState(format(new Date(), "yyyy-MM"));

  useEffect(() => {
    loadAccounts();
  }, [monthFilter]);

  useEffect(() => {
    filterAccounts();
  }, [accounts, searchTerm]);

  const loadAccounts = async () => {
    setLoading(true);

    // Obter user_id
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    // Buscar histórico de pagamentos filtrando por paid_month
    const { data: paymentHistory, error: historyError } = await supabase
      .from("account_payment_history")
      .select("*")
      .eq("user_id", user.id)
      .eq("paid_month", monthFilter)
      .order("paid_date", { ascending: false });

    if (historyError) {
      toast.error("Erro ao carregar histórico");
      console.error(historyError);
      setLoading(false);
      setAccounts([]);
      return;
    }

    if (!paymentHistory || paymentHistory.length === 0) {
      setLoading(false);
      setAccounts([]);
      return;
    }

    // Buscar as contas relacionadas
    const accountIds = [...new Set(paymentHistory.map((p: any) => p.account_id))];
    
    const { data: accountsData, error: accountsError } = await supabase
      .from("accounts")
      .select(`
        id,
        description,
        supplier_id,
        suppliers (
          id,
          name
        )
      `)
      .in("id", accountIds);

    if (accountsError) {
      toast.error("Erro ao carregar contas");
      console.error(accountsError);
      setLoading(false);
      setAccounts([]);
      return;
    }

    // Criar mapa de contas por ID
    const accountsMap = new Map();
    (accountsData || []).forEach((acc: any) => {
      accountsMap.set(acc.id, acc);
    });

    // Transformar os dados para o formato esperado
    const transformedData = paymentHistory.map((payment: any) => {
      const account = accountsMap.get(payment.account_id);
      return {
        id: payment.id,
        account_id: payment.account_id,
        description: account?.description || "",
        suppliers: account?.suppliers || null,
        amount: parseFloat(payment.amount) || 0,
        paid_month: payment.paid_month,
        paid_date: payment.paid_date,
        invoice_numbers: payment.invoice_numbers || [],
        recipient: payment.recipient || "",
        is_delivered: true,
      };
    });

    setLoading(false);
    setAccounts(transformedData);
  };

  const filterAccounts = () => {
    if (!searchTerm.trim()) {
      setFilteredAccounts(accounts);
      return;
    }

    const filtered = accounts.filter((account) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        account.description.toLowerCase().includes(searchLower) ||
        account.suppliers?.name.toLowerCase().includes(searchLower) ||
        account.invoice_numbers?.some((nf: string) => nf.toLowerCase().includes(searchLower)) ||
        account.recipient?.toLowerCase().includes(searchLower)
      );
    });

    setFilteredAccounts(filtered);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Histórico de Contas</h2>
          <p className="text-muted-foreground">
            Consulte contas por período
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="month">Competência (Mês/Ano)</Label>
                <Input
                  id="month"
                  type="month"
                  value={monthFilter}
                  onChange={(e) => setMonthFilter(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="search">Buscar</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Descrição, fornecedor ou NF..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filteredAccounts.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground">
                Nenhuma conta encontrada para o período selecionado
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Competência</TableHead>
                    <TableHead>Data de Pagamento</TableHead>
                    <TableHead>Destinatário</TableHead>
                    <TableHead>NF</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAccounts.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell className="font-medium">
                        {account.suppliers?.name}
                      </TableCell>
                      <TableCell>{account.description}</TableCell>
                      <TableCell>
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL'
                        }).format(account.amount)}
                      </TableCell>
                      <TableCell>
                        {account.paid_month ? format(parseISO(account.paid_month + "-01"), "MMMM 'de' yyyy", { locale: ptBR }) : "-"}
                      </TableCell>
                      <TableCell>
                        {account.paid_date ? format(parseISO(account.paid_date), "dd/MM/yyyy") : "-"}
                      </TableCell>
                      <TableCell>
                        {account.recipient || "-"}
                      </TableCell>
                      <TableCell>
                        {account.invoice_numbers?.join(", ") || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
