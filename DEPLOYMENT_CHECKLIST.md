# ✅ Checklist de Deploy - GitHub Pages

## Passos para fazer o deploy funcionar:

### 1. ⚠️ Tornar repositório PÚBLICO
- Settings → Danger Zone → Change repository visibility → Make public

### 2. 🔑 Configurar Secrets do Supabase no Environment

⚠️ **IMPORTANTE:** O workflow usa o environment `github-pages`, então os secrets DEVEM estar configurados nesse environment!

**Passo a passo:**

1. Vá em: **Settings** → **Environments** → clique em **github-pages**
2. Na seção **Environment secrets**, clique em **Add secret**
3. Adicione os 3 secrets um por um:

   **Secret 1:**
   - Nome: `VITE_SUPABASE_URL`
   - Valor: `https://nmisrxdladivuscombrj.supabase.co`

   **Secret 2:**
   - Nome: `VITE_SUPABASE_PROJECT_ID`
   - Valor: `nmisrxdladivuscombrj`

   **Secret 3:**
   - Nome: `VITE_SUPABASE_PUBLISHABLE_KEY`
   - Valor: (copie do Supabase Dashboard → Settings → API → anon/public key)

4. **Deployment protection rules:** 
   - Se houver regras de proteção ativadas, você pode desativá-las temporariamente para testar
   - Ou configure as regras conforme necessário

⚠️ **NOTA:** Se os secrets estiverem apenas no nível do repositório (não no environment), o workflow NÃO conseguirá acessá-los porque está configurado para usar o environment `github-pages`.

### 3. 🎯 Ativar GitHub Pages
- Settings → Pages
- Source: **GitHub Actions**
- Pronto!

### 4. 📝 Monitore o deploy
- Vá em **Actions** no repositório
- Veja se o workflow "Deploy to GitHub Pages" executou com sucesso
- Se falhou, clique para ver os logs
- O workflow agora tem um step "Verify Supabase secrets" que mostrará se os secrets estão configurados

### 5. 🌐 Acesse seu site
Após o deploy concluir:
- URL: `https://pssm-cit.github.io/gcti/`

---

## ⚠️ Troubleshooting

### ❌ Problema: "Add Supabase secrets to GitHub Actions workflow" em vermelho

**Solução:**
1. Verifique se os 3 secrets estão configurados no environment `github-pages`:
   - Settings → Environments → github-pages → Environment secrets
   - Devem aparecer: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PROJECT_ID`, `VITE_SUPABASE_PUBLISHABLE_KEY`
2. Se não estiverem, adicione-os conforme o passo 2 acima
3. Se estiverem, verifique se os nomes estão EXATAMENTE como no workflow (case-sensitive)

### ❌ Problema: "Deploy to GitHub Pages" falhando

**Possíveis causas e soluções:**

1. **Secrets não encontrados:**
   - Verifique o step "Verify Supabase secrets" nos logs
   - Se mostrar erro, os secrets não estão configurados no environment `github-pages`
   - Solução: Configure os secrets no environment conforme passo 2

2. **Build falhou:**
   - Veja os logs do step "Build"
   - Possíveis causas:
     - Erro de compilação no código
     - Dependências faltando
     - Erro nas variáveis de ambiente
   - Solução: Corrija os erros mostrados nos logs

3. **Permission denied:**
   - Verifique se o repositório está público
   - Verifique as permissões do workflow (já está configurado corretamente)
   - Solução: Torna o repositório público

4. **Environment protection rules:**
   - Se houver regras de proteção no environment `github-pages` que requerem aprovação
   - Solução: Aprove o deployment quando solicitado, ou desative temporariamente as regras

**Site dando 404?**

**Primeiro: Verificar se GitHub Actions está habilitado**
- Vá em **Settings → Actions → General**
- Em "Actions permissions" certifique-se que está selecionado:
  - ✅ **"Allow all actions and reusable workflows"**
- Se estiver "Disable actions", **nenhum workflow vai executar!**

**Depois:**
1. Verifique em **Actions** se o workflow "Deploy to GitHub Pages" executou com sucesso ✅
2. Verifique se em **Settings → Pages** está selecionado **"GitHub Actions"** (não "Deploy from a branch")
3. Se o workflow não executou ou falhou:
   - Vá em Actions
   - Clique no workflow que falhou
   - Veja os logs para identificar o erro
   - Procure pelo step "Verify Supabase secrets" para ver se os secrets estão configurados
4. Se tudo parece certo, aguarde 5-10 minutos após a conclusão do workflow

**Workflow falhou?**
- Verifique se os 3 secrets estão configurados corretamente **NO ENVIRONMENT `github-pages`**
- Verifique se o repositório está público
- Veja os logs em Actions para mais detalhes
- Possíveis erros comuns:
  - Secrets não configurados: erro "secret not found" ou step "Verify Supabase secrets" falhando
  - Build falhou: verifique logs do step "Build"
  - Permissions: verifique se tem Pages write permission (já está configurado)

**Pages não aparece?**
- Certifique-se que o workflow executou pelo menos uma vez
- Aguarde alguns minutos após o primeiro deploy
- Verifique se selecionou "GitHub Actions" como source

---

## 🔍 Como verificar se os secrets estão configurados corretamente

1. Vá em **Settings → Environments → github-pages**
2. Na seção **Environment secrets**, você deve ver os 3 secrets listados
3. Se não aparecerem, adicione-os conforme o passo 2
4. Após adicionar, faça um novo commit ou dispare o workflow manualmente (Actions → Deploy to GitHub Pages → Run workflow)

---

**Pronto! Toda vez que fizer push na branch `main`, o deploy acontece automaticamente! 🚀**

