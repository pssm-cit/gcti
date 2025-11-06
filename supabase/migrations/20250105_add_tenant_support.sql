-- Migração: Converter sistema de user_id para tenant_id
-- Data: 2025-01-05
-- Descrição: Adiciona tenant_id nas tabelas accounts e suppliers e atualiza políticas RLS

-- Função helper para obter o tenant_id do usuário logado
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  result UUID;
BEGIN
  SELECT tenant_id INTO result
  FROM public.profiles
  WHERE id = auth.uid();
  
  RETURN result;
END;
$$;

-- Adicionar coluna tenant_id na tabela suppliers (se não existir)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'suppliers' 
    AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE public.suppliers ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Adicionar coluna tenant_id na tabela accounts (se não existir)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'accounts' 
    AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE public.accounts ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Adicionar coluna tenant_id na tabela account_payment_history (se não existir)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'account_payment_history' 
    AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE public.account_payment_history ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Migrar dados existentes: atribuir tenant_id baseado no user_id
UPDATE public.suppliers s
SET tenant_id = p.tenant_id
FROM public.profiles p
WHERE s.user_id = p.id AND s.tenant_id IS NULL;

UPDATE public.accounts a
SET tenant_id = p.tenant_id
FROM public.profiles p
WHERE a.user_id = p.id AND a.tenant_id IS NULL;

UPDATE public.account_payment_history aph
SET tenant_id = p.tenant_id
FROM public.profiles p
WHERE aph.user_id = p.id AND aph.tenant_id IS NULL;

-- Remover políticas antigas baseadas em user_id
DROP POLICY IF EXISTS "Users can view their own suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Users can create their own suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Users can update their own suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Users can delete their own suppliers" ON public.suppliers;

DROP POLICY IF EXISTS "Users can view their own accounts" ON public.accounts;
DROP POLICY IF EXISTS "Users can create their own accounts" ON public.accounts;
DROP POLICY IF EXISTS "Users can update their own accounts" ON public.accounts;
DROP POLICY IF EXISTS "Users can delete their own accounts" ON public.accounts;

-- Criar novas políticas baseadas em tenant_id para suppliers
CREATE POLICY "Users can view suppliers from their tenant"
  ON public.suppliers FOR SELECT
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can create suppliers in their tenant"
  ON public.suppliers FOR INSERT
  WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can update suppliers in their tenant"
  ON public.suppliers FOR UPDATE
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can delete suppliers in their tenant"
  ON public.suppliers FOR DELETE
  USING (tenant_id = public.get_user_tenant_id());

-- Criar novas políticas baseadas em tenant_id para accounts
CREATE POLICY "Users can view accounts from their tenant"
  ON public.accounts FOR SELECT
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can create accounts in their tenant"
  ON public.accounts FOR INSERT
  WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can update accounts in their tenant"
  ON public.accounts FOR UPDATE
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can delete accounts in their tenant"
  ON public.accounts FOR DELETE
  USING (tenant_id = public.get_user_tenant_id());

-- Criar políticas para account_payment_history (se a tabela existir)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'account_payment_history') THEN
    DROP POLICY IF EXISTS "Users can view their own payment history" ON public.account_payment_history;
    DROP POLICY IF EXISTS "Users can create their own payment history" ON public.account_payment_history;
    DROP POLICY IF EXISTS "Users can update their own payment history" ON public.account_payment_history;
    DROP POLICY IF EXISTS "Users can delete their own payment history" ON public.account_payment_history;

    CREATE POLICY "Users can view payment history from their tenant"
      ON public.account_payment_history FOR SELECT
      USING (tenant_id = public.get_user_tenant_id());

    CREATE POLICY "Users can create payment history in their tenant"
      ON public.account_payment_history FOR INSERT
      WITH CHECK (tenant_id = public.get_user_tenant_id());

    CREATE POLICY "Users can update payment history in their tenant"
      ON public.account_payment_history FOR UPDATE
      USING (tenant_id = public.get_user_tenant_id());

    CREATE POLICY "Users can delete payment history in their tenant"
      ON public.account_payment_history FOR DELETE
      USING (tenant_id = public.get_user_tenant_id());
  END IF;
END $$;

