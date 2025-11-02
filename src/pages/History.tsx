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

    const [year, month] = monthFilter.split("-");
    const startDate = `${year}-${month}-01`;
    const endDate = `${year}-${month}-31`;

    const { data, error } = await supabase
      .from("accounts")
      .select(`
        *,
        suppliers (
          id,
          name
        )
      `)
      .gte("issue_date", startDate)
      .lte("issue_date", endDate)
      .order("issue_date", { ascending: false });

    setLoading(false);

    if (error) {
      toast.error("Erro ao carregar histórico");
      console.error(error);
      return;
    }

    setAccounts(data || []);
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
        account.invoice_numbers?.some((nf: string) => nf.toLowerCase().includes(searchLower))
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
                    <TableHead>Emissão</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Status</TableHead>
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
                        {format(parseISO(account.issue_date), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell>
                        {format(parseISO(account.due_date), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell>
                        {account.is_delivered ? (
                          <Badge className="bg-success text-success-foreground">
                            Entregue
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Pendente</Badge>
                        )}
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
