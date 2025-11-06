import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<string>("all");
  const [dueDateStart, setDueDateStart] = useState("");
  const [dueDateEnd, setDueDateEnd] = useState("");
  const [deliveryDateStart, setDeliveryDateStart] = useState("");
  const [deliveryDateEnd, setDeliveryDateEnd] = useState("");
  const [selectedAccount, setSelectedAccount] = useState<any | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [profileStatus, setProfileStatus] = useState<string>("approved");

  useEffect(() => {
    loadSuppliers();
    loadAccounts();
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [dueDateStart, dueDateEnd, deliveryDateStart, deliveryDateEnd, selectedSupplier]);

  useEffect(() => {
    filterAccounts();
  }, [accounts, searchTerm]);

  const loadSuppliers = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("status, tenant_id")
      .eq("id", user.id)
      .single();
    
    if (profile && (profile as any).status) setProfileStatus((profile as any).status);

    if (!profile?.tenant_id) {
      console.error("Erro: usuário não tem tenant configurado");
      return;
    }

    const { data, error } = await supabase
      .from("suppliers")
      .select("id, name, status")
      .eq("tenant_id", profile.tenant_id)
      .order("name");

    if (error) {
      console.error("Erro ao carregar fornecedores:", error);
      return;
    }

    setSuppliers(data || []);
  };

  const loadAccounts = async () => {
    setLoading(true);

    // Obter tenant_id do perfil do usuário
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", user.id)
      .single();

    if (!profile?.tenant_id) {
      toast.error("Erro: usuário não tem tenant configurado");
      setLoading(false);
      return;
    }

    // Construir query base
    let query = supabase
      .from("account_payment_history")
      .select("*")
      .eq("tenant_id", profile.tenant_id);

    // Aplicar filtros de data de entrega
    if (deliveryDateStart) {
      query = query.gte("paid_date", deliveryDateStart);
    }
    if (deliveryDateEnd) {
      query = query.lte("paid_date", deliveryDateEnd);
    }

    const { data: paymentHistory, error: historyError } = await query.order("paid_date", { ascending: false });

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
    
    let accountsQuery = supabase
      .from("accounts")
      .select(`
        id,
        description,
        supplier_id,
        dia_vencimento,
        suppliers (
          id,
          name
        )
      `)
      .in("id", accountIds);

    // Aplicar filtro de fornecedor se selecionado
    if (selectedSupplier !== "all") {
      accountsQuery = accountsQuery.eq("supplier_id", selectedSupplier);
    }

    const { data: accountsData, error: accountsError } = await accountsQuery;

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
    const transformedData = paymentHistory
      .map((payment: any) => {
        const account = accountsMap.get(payment.account_id);
        if (!account) return null; // Pular se conta não foi encontrada (filtro de fornecedor)

        // Calcular data de vencimento baseada no paid_month e dia_vencimento
        const [year, month] = payment.paid_month.split("-");
        const dueDay = account.dia_vencimento || 1;
        const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
        const actualDueDay = Math.min(dueDay, daysInMonth);
        const dueDate = new Date(parseInt(year), parseInt(month) - 1, actualDueDay);

        return {
          id: payment.id,
          account_id: payment.account_id,
          description: account?.description || "",
          suppliers: account?.suppliers || null,
          amount: parseFloat(payment.amount) || 0,
          paid_month: payment.paid_month,
          paid_date: payment.paid_date,
          due_date: dueDate.toISOString().split('T')[0],
          invoice_numbers: payment.invoice_numbers || [],
          recipient: payment.recipient || "",
          is_delivered: true,
          cost_centers_snapshot: payment.cost_centers_snapshot || [],
        };
      })
      .filter(Boolean); // Remover nulls

    // Aplicar filtro de range de data de vencimento
    let filtered = transformedData;
    if (dueDateStart) {
      filtered = filtered.filter(acc => acc.due_date >= dueDateStart);
    }
    if (dueDateEnd) {
      filtered = filtered.filter(acc => acc.due_date <= dueDateEnd);
    }

    setLoading(false);
    setAccounts(filtered);
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
        {profileStatus !== "approved" && (
          <div className="mb-6 p-4 border rounded-md bg-muted/30">
            Sua conta está pendente de aprovação. Aguarde um administrador aprovar seu acesso.
          </div>
        )}
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
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="supplier">Fornecedor</Label>
                <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os fornecedores" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os fornecedores</SelectItem>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name} {supplier.status === false ? "(Inativo)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueDateStart">Vencimento (De)</Label>
                <Input
                  id="dueDateStart"
                  type="date"
                  value={dueDateStart}
                  onChange={(e) => setDueDateStart(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueDateEnd">Vencimento (Até)</Label>
                <Input
                  id="dueDateEnd"
                  type="date"
                  value={dueDateEnd}
                  onChange={(e) => setDueDateEnd(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="deliveryDateStart">Entrega (De)</Label>
                <Input
                  id="deliveryDateStart"
                  type="date"
                  value={deliveryDateStart}
                  onChange={(e) => setDeliveryDateStart(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="deliveryDateEnd">Entrega (Até)</Label>
                <Input
                  id="deliveryDateEnd"
                  type="date"
                  value={deliveryDateEnd}
                  onChange={(e) => setDeliveryDateEnd(e.target.value)}
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
                    <TableHead>Data de Entrega</TableHead>
                    <TableHead>Destinatário</TableHead>
                    <TableHead>NF</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAccounts.map((account) => (
                    <TableRow 
                      key={account.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => {
                        setSelectedAccount(account);
                        setDialogOpen(true);
                      }}
                    >
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

      {/* Modal de Detalhes */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes</DialogTitle>
            <DialogDescription>
              Informações completas sobre o registro selecionado
            </DialogDescription>
          </DialogHeader>

          {selectedAccount && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-sm font-medium text-muted-foreground">Fornecedor</Label>
                  <p className="text-base font-medium">{selectedAccount.suppliers?.name || "-"}</p>
                </div>

                <div className="space-y-1">
                  <Label className="text-sm font-medium text-muted-foreground">Valor</Label>
                  <p className="text-base font-medium">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    }).format(selectedAccount.amount)}
                  </p>
                </div>

                <div className="space-y-1">
                  <Label className="text-sm font-medium text-muted-foreground">Descrição</Label>
                  <p className="text-base">{selectedAccount.description || "-"}</p>
                </div>

                <div className="space-y-1">
                  <Label className="text-sm font-medium text-muted-foreground">Competência</Label>
                  <p className="text-base">
                    {selectedAccount.paid_month ? format(parseISO(selectedAccount.paid_month + "-01"), "MMMM 'de' yyyy", { locale: ptBR }) : "-"}
                  </p>
                </div>

                <div className="space-y-1">
                  <Label className="text-sm font-medium text-muted-foreground">Data de Vencimento</Label>
                  <p className="text-base">
                    {selectedAccount.due_date ? format(parseISO(selectedAccount.due_date), "dd/MM/yyyy") : "-"}
                  </p>
                </div>

                <div className="space-y-1">
                  <Label className="text-sm font-medium text-muted-foreground">Data de Entrega</Label>
                  <p className="text-base">
                    {selectedAccount.paid_date ? format(parseISO(selectedAccount.paid_date), "dd/MM/yyyy") : "-"}
                  </p>
                </div>

                <div className="space-y-1">
                  <Label className="text-sm font-medium text-muted-foreground">Destinatário</Label>
                  <p className="text-base">{selectedAccount.recipient || "-"}</p>
                </div>

                <div className="space-y-1">
                  <Label className="text-sm font-medium text-muted-foreground">Notas Fiscais</Label>
                  <div className="flex flex-wrap gap-2">
                    {selectedAccount.invoice_numbers && selectedAccount.invoice_numbers.length > 0 ? (
                      selectedAccount.invoice_numbers.map((nf: string, index: number) => (
                        <Badge key={index} variant="secondary">
                          {nf}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-base text-muted-foreground">-</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Rateio dos Centros de Custo */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">Rateio (Centros de Custo)</Label>
                {Array.isArray(selectedAccount.cost_centers_snapshot) && selectedAccount.cost_centers_snapshot.length > 0 ? (
                  <div className="border rounded-md divide-y">
                    {selectedAccount.cost_centers_snapshot.map((cc: any, idx: number) => (
                      <div key={idx} className="grid grid-cols-3 gap-2 p-2 text-sm">
                        <div className="font-medium">{cc.code}</div>
                        <div className="text-muted-foreground">{Number(cc.percent)}%</div>
                        <div className="text-right">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(cc.value) || 0)}
                        </div>
                      </div>
                    ))}
                    <div className="grid grid-cols-3 gap-2 p-2 text-sm bg-muted/30">
                      <div className="font-medium">Total</div>
                      <div className="text-muted-foreground">
                        {selectedAccount.cost_centers_snapshot.reduce((s: number, c: any) => s + Number(c.percent || 0), 0)}%
                      </div>
                      <div className="text-right font-medium">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                          selectedAccount.cost_centers_snapshot.reduce((s: number, c: any) => s + Number(c.value || 0), 0)
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Sem rateio registrado para esta entrega.</p>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setDialogOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
