-- Migration: Atualizar estrutura de accounts para faturas recorrentes
-- Data: 2025-11-05

-- Adicionar novos campos para sistema de faturas recorrentes
ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS dia_emissao INTEGER CHECK (dia_emissao >= 1 AND dia_emissao <= 31),
  ADD COLUMN IF NOT EXISTS dia_vencimento INTEGER CHECK (dia_vencimento >= 1 AND dia_vencimento <= 31),
  ADD COLUMN IF NOT EXISTS data_fim DATE,
  ADD COLUMN IF NOT EXISTS last_paid_month VARCHAR(7); -- Formato YYYY-MM

-- Tornar issue_date nullable (será removido no futuro)
ALTER TABLE public.accounts
  ALTER COLUMN issue_date DROP NOT NULL;

-- Tornar due_date nullable (será usado apenas para histórico)
ALTER TABLE public.accounts
  ALTER COLUMN due_date DROP NOT NULL;

-- Criar índice para melhorar performance nas consultas por dia_vencimento
CREATE INDEX IF NOT EXISTS idx_accounts_dia_vencimento ON public.accounts(dia_vencimento);
CREATE INDEX IF NOT EXISTS idx_accounts_last_paid_month ON public.accounts(last_paid_month);
CREATE INDEX IF NOT EXISTS idx_accounts_data_fim ON public.accounts(data_fim);

-- Criar tabela de histórico de pagamentos para manter registro permanente
CREATE TABLE IF NOT EXISTS public.account_payment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  paid_month VARCHAR(7) NOT NULL, -- Formato YYYY-MM
  paid_date DATE NOT NULL,
  invoice_numbers TEXT[],
  recipient TEXT,
  amount DECIMAL(12, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.account_payment_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own payment history"
  ON public.account_payment_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own payment history"
  ON public.account_payment_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Função para resetar status de entregue quando mudar de mês
CREATE OR REPLACE FUNCTION public.reset_recurring_accounts_status()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  current_month VARCHAR(7);
BEGIN
  -- Obter mês atual no formato YYYY-MM
  current_month := TO_CHAR(CURRENT_DATE, 'YYYY-MM');
  
  -- Resetar is_delivered e limpar campos de entrega para contas recorrentes
  -- que foram pagas em meses anteriores
  UPDATE public.accounts
  SET 
    is_delivered = FALSE,
    delivered_at = NULL,
    invoice_numbers = NULL,
    recipient = NULL,
    last_paid_month = NULL
  WHERE 
    last_paid_month IS NOT NULL
    AND last_paid_month < current_month
    AND (data_fim IS NULL OR data_fim >= CURRENT_DATE);
END;
$$;

-- Comentários para documentação
COMMENT ON COLUMN public.accounts.dia_emissao IS 'Dia do mês (1-31) em que a fatura é emitida';
COMMENT ON COLUMN public.accounts.dia_vencimento IS 'Dia do mês (1-31) em que a fatura vence';
COMMENT ON COLUMN public.accounts.data_fim IS 'Data final para faturas com prazo determinado (NULL = recorrente indefinida)';
COMMENT ON COLUMN public.accounts.last_paid_month IS 'Último mês (YYYY-MM) em que a fatura foi paga, usado para resetar status ao mudar de mês';
COMMENT ON TABLE public.account_payment_history IS 'Histórico permanente de pagamentos de faturas recorrentes';
