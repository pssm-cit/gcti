# ✅ Checklist de Deploy - GitHub Pages

## Passos para fazer o deploy funcionar:

### 1. ⚠️ Tornar repositório PÚBLICO
- Settings → Danger Zone → Change repository visibility → Make public

### 2. 🔑 Configurar Secrets do Supabase
Vá em: **Settings** → **Secrets and variables** → **Actions** → clique na aba **Secrets** → **New repository secret**

⚠️ **IMPORTANTE:** 
- Use a aba **"Secrets"**, não "Variables"!
- Adicione **FORA** do environment "github-pages" (no nível do repositório)
- Você verá "Repository secrets" → clique em "New repository secret"
- **Deployment protection rules:** Não precisa marcar nada (deixe tudo desmarcado)

Adicione os 3 secrets:

1. **VITE_SUPABASE_URL** 
   - Valor: `https://nmisrxdladivuscombrj.supabase.co`

2. **VITE_SUPABASE_PROJECT_ID**
   - Valor: `nmisrxdladivuscombrj`

3. **VITE_SUPABASE_PUBLISHABLE_KEY**
   - Valor: (copie do Supabase Dashboard → Settings → API → anon/public key)

### 3. 🎯 Ativar GitHub Pages
- Settings → Pages
- Source: **GitHub Actions**
- Pronto!

### 4. 📝 Monitore o deploy
- Vá em **Actions** no repositório
- Veja se o workflow "Deploy to GitHub Pages" executou com sucesso
- Se falhou, clique para ver os logs

### 5. 🌐 Acesse seu site
Após o deploy concluir:
- URL: `https://pssm-cit.github.io/gcti/`

---

## ⚠️ Troubleshooting

**Site dando 404?**
1. Verifique em **Actions** se o workflow "Deploy to GitHub Pages" executou com sucesso ✅
2. Verifique se em **Settings → Pages** está selecionado **"GitHub Actions"** (não "Deploy from a branch")
3. Se o workflow não executou ou falhou:
   - Vá em Actions
   - Clique no workflow que falhou
   - Veja os logs para identificar o erro
4. Se tudo parece certo, aguarde 5-10 minutos após a conclusão do workflow

**Workflow falhou?**
- Verifique se os 3 secrets estão configurados corretamente
- Verifique se o repositório está público
- Veja os logs em Actions para mais detalhes
- Possíveis erros comuns:
  - Secrets não configurados: erro "secret not found"
  - Build falhou: verifique logs do step "Build"
  - Permissions: verifique se tem Pages write permission

**Pages não aparece?**
- Certifique-se que o workflow executou pelo menos uma vez
- Aguarde alguns minutos após o primeiro deploy
- Verifique se selecionou "GitHub Actions" como source

---

**Pronto! Toda vez que fizer push na branch `main`, o deploy acontece automaticamente! 🚀**

