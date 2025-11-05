import { Button } from "@/components/ui/button";
import { LogOut, Home, History, FileText, Building2 } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useEffect, useState } from "react";

export function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles").select("admin").eq("id", user.id).single();
      if (data && (data as any).admin === true) setIsAdmin(true);
    })();
  }, []);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Erro ao fazer logout");
      return;
    }
    navigate("/auth");
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="border-b bg-card shadow-sm">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              GCTI
            </h1>
          </Link>
          
          <div className="flex gap-2">
            <Button
              asChild
              variant={isActive("/") ? "default" : "ghost"}
              size="sm"
            >
              <Link to="/">
                <Home className="w-4 h-4 mr-2" />
                Dashboard
              </Link>
            </Button>
            
            <Button
              asChild
              variant={isActive("/suppliers") ? "default" : "ghost"}
              size="sm"
            >
              <Link to="/suppliers">
                <Building2 className="w-4 h-4 mr-2" />
                Fornecedores
              </Link>
            </Button>
            
            <Button
              asChild
              variant={isActive("/history") ? "default" : "ghost"}
              size="sm"
            >
              <Link to="/history">
                <History className="w-4 h-4 mr-2" />
                Histórico
              </Link>
            </Button>
            {isAdmin && (
              <Button
                asChild
                variant={isActive("/admin") ? "default" : "ghost"}
                size="sm"
              >
                <Link to="/admin">
                  <History className="w-4 h-4 mr-2" />
                  Admin
                </Link>
              </Button>
            )}
          </div>
        </div>

        <Button variant="ghost" size="sm" onClick={handleLogout}>
          <LogOut className="w-4 h-4 mr-2" />
          Sair
        </Button>
      </div>
    </nav>
  );
}
