import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

const signupSchema = z.object({
  fullName: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
});

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
});

export default function Auth() {
  console.log("[Auth.tsx] Componente Auth renderizando");
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("login");

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Signup state
  const [signupFullName, setSignupFullName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");

  useEffect(() => {
    console.log("[Auth.tsx] useEffect - onAuthStateChange iniciado");
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("[Auth.tsx] onAuthStateChange - event:", event, "session:", !!session);
      if (session && event === "SIGNED_IN") {
        console.log("[Auth.tsx] Usuário autenticado, verificando perfil");
        // Verificar status do perfil antes de redirecionar
        try {
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          if (userError) {
            console.error("[Auth.tsx] Erro ao obter usuário:", userError);
            return;
          }
          
          if (user) {
            console.log("[Auth.tsx] Buscando perfil do usuário");
            const { data: profile, error: profileError } = await supabase
              .from("profiles")
              .select("status")
              .eq("id", user.id)
              .single();
            
            if (profileError) {
              console.error("[Auth.tsx] Erro ao buscar perfil:", profileError);
              // Continuar mesmo com erro no perfil
            }
            
            if (profile && (profile as any).status === "pending") {
              // Usuário pendente: fazer logout e não redirecionar
              console.log("[Auth.tsx] Usuário pendente, fazendo logout");
              await supabase.auth.signOut();
              toast.error("Seu cadastro está pendente de aprovação pelo administrador.");
              return;
            }
          }
          
          console.log("[Auth.tsx] Redirecionando para /");
          navigate("/", { replace: true });
        } catch (error) {
          console.error("[Auth.tsx] Erro no onAuthStateChange:", error);
        }
      }
    });

    // Remover getSession aqui pois está causando timeout
    // O onAuthStateChange já cuida da navegação

    return () => {
      console.log("[Auth.tsx] Limpando subscription");
      subscription.unsubscribe();
    };
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = loginSchema.safeParse({ email: loginEmail, password: loginPassword });
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }

    setLoading(true);

    console.log("[Auth.tsx] Tentando fazer login");
    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });

    if (error) {
      console.error("[Auth.tsx] Erro no login:", error);
      setLoading(false);
      if (error.message.includes("Invalid login credentials")) {
        toast.error("Email ou senha incorretos");
      } else {
        toast.error("Erro ao fazer login: " + error.message);
      }
      return;
    }

    console.log("[Auth.tsx] Login bem-sucedido, aguardando onAuthStateChange");
    // Não fazer setLoading(false) aqui - deixar o onAuthStateChange cuidar da navegação
    // O onAuthStateChange vai redirecionar automaticamente
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = signupSchema.safeParse({ 
      fullName: signupFullName, 
      email: signupEmail, 
      password: signupPassword 
    });
    
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: signupEmail,
      password: signupPassword,
      options: {
        data: {
          full_name: signupFullName,
        },
        emailRedirectTo: `${window.location.origin}/`,
      },
    });

    setLoading(false);

    if (error) {
      if (error.message.includes("User already registered")) {
        toast.error("Este email já está cadastrado");
      } else {
        toast.error("Erro ao criar conta: " + error.message);
      }
      return;
    }

    // Criar/atualizar perfil como pendente de aprovação
    // IMPORTANTE: Não criar tenant automaticamente - o admin fará isso na aprovação
    try {
      const newUserId = data?.user?.id;
      if (newUserId) {
        // Tenta inserir/atualizar com colunas avançadas; se não existirem, faz fallback só com full_name
        const { error: profileUpsertError } = await supabase
          .from("profiles")
          .upsert({
            id: newUserId,
            full_name: signupFullName,
            status: "pending",
            admin: false,
            tenant_id: null, // Garantir que tenant_id seja null - será definido pelo admin na aprovação
          } as any, { onConflict: "id" } as any);

        if (profileUpsertError && profileUpsertError.code === "42703") {
          // Colunas ainda não existem: salva apenas o nome
          await supabase.from("profiles").upsert({ id: newUserId, full_name: signupFullName } as any, { onConflict: "id" } as any);
        }
      }
    } catch (e) {
      // Ignorar erros de schema aqui, já que a aprovação será feita pelo admin
      console.error(e);
    }

    // Fazer logout imediatamente após cadastro para não criar sessão automática
    await supabase.auth.signOut();

    // Mostrar alerta informativo sobre aprovação pendente
    toast.success("Cadastro realizado com sucesso! Seu cadastro está pendente de aprovação pelo administrador.", {
      duration: 6000,
    });
    setActiveTab("login");
    // Limpar formulário
    setSignupFullName("");
    setSignupEmail("");
    setSignupPassword("");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img 
              src="https://portosecosuldeminas.com.br/wp-content/uploads/2022/12/logo-portosecosuldeminas-header-b.png" 
              alt="PSSM" 
              className="h-16 w-auto"
            />
          </div>
          <CardDescription>Gestão de Contas Financeiras</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">        
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Senha</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Entrando..." : "Entrar"}
                </Button>
              </form>
              <div className="mt-4 text-center text-sm">
                <button type="button" className="text-primary underline" onClick={() => setActiveTab("signup")}>
                  Cadastre-se
                </button>
              </div>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Nome Completo</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="Seu nome"
                    value={signupFullName}
                    onChange={(e) => setSignupFullName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Senha</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Criando conta..." : "Criar Conta"}
                </Button>
                <div className="mt-2 text-center text-sm">
                  <button type="button" className="text-muted-foreground underline" onClick={() => setActiveTab("login")}>
                    Voltar para login
                  </button>
                </div>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
ccc