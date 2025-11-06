-- Migração: Garantir que trigger handle_new_user não cria tenant automaticamente
-- Data: 2025-01-05
-- Descrição: Atualiza o trigger handle_new_user para garantir que tenant_id seja sempre null ao criar novo usuário

-- Atualizar função handle_new_user para garantir que tenant_id seja NULL
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Inserir perfil apenas se não existir
  INSERT INTO public.profiles (id, full_name, status, admin, tenant_id)
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data->>'full_name',
    'pending',  -- Status pendente por padrão
    false,      -- Não é admin por padrão
    NULL        -- tenant_id sempre NULL - será definido pelo admin na aprovação
  )
  ON CONFLICT (id) DO NOTHING; -- Não atualizar se já existir (para evitar sobrescrever aprovação)
  
  RETURN NEW;
END;
$$;

-- Garantir que o trigger está ativo
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
