-- Correção: Função helper para verificar se usuário é admin sem dependência circular
-- Esta função usa SECURITY DEFINER para bypassar RLS e verificar se o usuário é admin

CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND admin = true
  );
END;
$$;

-- Remover as políticas antigas de admin se existirem (para evitar conflitos)
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

-- Criar nova política para administradores verem todos os perfis
-- Usa a função helper para evitar dependência circular
-- NOTA: Esta política funciona em conjunto com "Users can view their own profile"
-- PostgreSQL RLS combina políticas com OR, então ambas funcionam
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin(auth.uid()));

-- Criar nova política para administradores atualizarem todos os perfis
-- Usa a função helper para evitar dependência circular
-- NOTA: Esta política funciona em conjunto com "Users can update their own profile"
CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (public.is_admin(auth.uid()));
