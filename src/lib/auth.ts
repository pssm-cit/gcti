import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Verifica se o usuário está aprovado e redireciona para /auth se estiver pendente
 * @param navigate Função de navegação do react-router-dom
 * @returns true se o usuário está aprovado, false caso contrário
 */
export async function checkUserApproval(navigate: (path: string) => void): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    navigate("/auth");
    return false;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", user.id)
    .single();

  if (profile && (profile as any).status === "pending") {
    await supabase.auth.signOut();
    toast.error("Seu cadastro está pendente de aprovação pelo administrador.");
    navigate("/auth");
    return false;
  }

  return true;
}

