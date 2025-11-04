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

---

## 🧪 Como Testar se Está Funcionando

### 1. ✅ Verificar se o Site Está Online

1. **Acesse a URL do seu site:**
   ```
   https://pssm-cit.github.io/gcti/
   ```

2. **O que deve acontecer:**
   - ✅ A página deve carregar (não deve dar erro 404)
   - ✅ Você deve ver a tela de login/cadastro
   - ✅ A interface deve estar funcionando (botões, formulários visíveis)
   - ✅ Não deve aparecer erros no console do navegador (F12 → Console)

3. **Se der erro 404:**
   - Aguarde mais alguns minutos (pode levar até 10 minutos para propagar)
   - Verifique em **Settings → Pages** se está configurado como "GitHub Actions"
   - Verifique em **Actions** se o último workflow foi concluído com sucesso

### 2. 🔍 Verificar Console do Navegador

1. **Abra as Ferramentas de Desenvolvedor:**
   - Pressione `F12` ou `Ctrl+Shift+I` (Windows/Linux)
   - Ou `Cmd+Option+I` (Mac)

2. **Vá na aba "Console":**

3. **O que procurar:**
   - ❌ **Erros em vermelho** = Problema
   - ✅ **Apenas avisos em amarelo** = Normal (pode ignorar)
   - ✅ **Sem erros** = Perfeito!

4. **Erros comuns a verificar:**
   - ❌ `Failed to fetch` ou `Network error` = Problema de conexão com Supabase
   - ❌ `VITE_SUPABASE_URL is not defined` = Secrets não configurados corretamente
   - ❌ `404 Not Found` = Caminhos/rotas incorretos

### 3. 🔐 Testar Autenticação (Login/Cadastro)

1. **Testar Cadastro:**
   - Clique na aba "Cadastrar"
   - Preencha:
     - Nome completo (mínimo 3 caracteres)
     - Email válido
     - Senha (mínimo 6 caracteres)
   - Clique em "Criar Conta"
   - ✅ Deve mostrar mensagem de sucesso
   - ✅ Deve redirecionar para o Dashboard

2. **Testar Login:**
   - Faça logout (se estiver logado)
   - Clique na aba "Entrar"
   - Digite o email e senha que você criou
   - Clique em "Entrar"
   - ✅ Deve fazer login com sucesso
   - ✅ Deve redirecionar para o Dashboard

3. **Testar Logout:**
   - Clique no botão "Sair" no canto superior direito
   - ✅ Deve deslogar e voltar para a tela de login

### 4. 🗄️ Testar Conexão com Supabase

1. **Com as ferramentas de desenvolvedor abertas (F12):**
   - Vá na aba "Network" (Rede)
   - Recarregue a página (F5)
   - Filtre por "Fetch/XHR"
   - ✅ Deve ver requisições para `supabase.co`
   - ✅ As requisições devem ter status `200` (sucesso) ou `401` (não autenticado, normal)

2. **Testar criação de dados:**
   - Faça login na aplicação
   - No Dashboard, clique em "Nova Conta"
   - Preencha os campos e salve
   - ✅ A conta deve aparecer no Dashboard
   - ✅ Não deve dar erro

### 5. 📱 Testar Funcionalidades Principais

1. **Dashboard (Página Principal):**
   - ✅ Deve mostrar "Dashboard" no título
   - ✅ Deve ter botão "Nova Conta"
   - ✅ Se não tiver contas, deve mostrar mensagem "Nenhuma conta cadastrada ainda"

2. **Criar Nova Conta:**
   - Clique em "Nova Conta"
   - Preencha os campos obrigatórios
   - Salve
   - ✅ A conta deve aparecer na lista
   - ✅ Não deve dar erro

3. **Navegação:**
   - ✅ Clique em "Histórico" - deve navegar para /history
   - ✅ Clique em "Dashboard" - deve voltar para /
   - ✅ Os links devem funcionar corretamente

### 6. 🐛 Verificar Logs do Workflow (Se Tiver Problemas)

1. **Vá em GitHub → Actions:**
   - Clique no último workflow executado
   - Veja cada step:
     - ✅ "Checkout" - deve passar
     - ✅ "Setup Node.js" - deve passar
     - ✅ "Install dependencies" - deve passar
     - ✅ "Verify Supabase secrets" - deve mostrar "✅ All Supabase secrets are configured"
     - ✅ "Build" - deve passar sem erros
     - ✅ "Setup Pages" - deve passar
     - ✅ "Upload artifact" - deve passar
     - ✅ "Deploy to GitHub Pages" - deve passar

2. **Se algum step falhar:**
   - Clique no step para ver os logs detalhados
   - Procure por mensagens de erro
   - Verifique o troubleshooting acima

### 7. 🔄 Teste de Deploy Automático

1. **Faça uma pequena mudança no código:**
   - Pode ser qualquer coisa (ex: alterar um texto)

2. **Faça commit e push:**
   ```bash
   git add .
   git commit -m "Test: verificar deploy automático"
   git push origin main
   ```

3. **Monitore o deploy:**
   - Vá em **Actions** no GitHub
   - ✅ Deve aparecer um novo workflow rodando
   - ✅ Deve completar com sucesso em alguns minutos

4. **Verifique se a mudança apareceu:**
   - Aguarde o deploy concluir
   - Acesse o site novamente
   - ✅ Sua mudança deve estar visível (pode precisar fazer Ctrl+F5 para limpar cache)

### ✅ Checklist Rápido de Teste

Use este checklist rápido para verificar tudo:

- [ ] Site acessível em `https://pssm-cit.github.io/gcti/`
- [ ] Tela de login/cadastro aparece corretamente
- [ ] Sem erros no console do navegador (F12)
- [ ] Consigo criar uma nova conta
- [ ] Consigo fazer login com a conta criada
- [ ] Dashboard carrega após login
- [ ] Consigo criar uma nova conta financeira
- [ ] Consigo ver a conta criada no Dashboard
- [ ] Navegação entre páginas funciona
- [ ] Logout funciona corretamente
- [ ] Workflow no GitHub Actions está verde/passando

### 🎯 Resultado Esperado

Se todos os testes acima passarem, **seu deploy está funcionando perfeitamente!** 🎉

Se algum teste falhar, verifique:
1. Os logs do console do navegador (F12)
2. Os logs do workflow no GitHub Actions
3. Se os secrets estão configurados corretamente
4. O troubleshooting acima

---

**Pronto! Agora você sabe como testar se tudo está funcionando! 🚀**

