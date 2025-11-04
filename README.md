# GCTI

Sistema web profissional para gerenciamento de contas. Desenvolvido com React, TypeScript e Supabase para gerenciar contas a pagar, fornecedores e histórico financeiro.

## 📋 Índice

- [Sobre o Projeto](#sobre-o-projeto)
- [Tecnologias](#tecnologias)
- [Requisitos](#requisitos)
- [Instalação](#instalação)
- [Configuração](#configuração)
- [Scripts Disponíveis](#scripts-disponíveis)
- [Configuração do Banco de Dados](#configuração-do-banco-de-dados)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Deploy](#deploy)
- [Contribuindo](#contribuindo)

## 🎯 Sobre o Projeto

O GCTI é uma aplicação web moderna para gerenciamento financeiro que permite:

- ✅ Cadastro e gerenciamento de contas a pagar
- ✅ Controle de fornecedores
- ✅ Histórico completo de contas
- ✅ Autenticação de usuários com Supabase Auth
- ✅ Interface responsiva e moderna
- ✅ Row Level Security (RLS) para proteção de dados

## 🏗️ Arquitetura e Infraestrutura

### ⚡ Não precisa de servidor backend!

Esta aplicação utiliza uma arquitetura **JAMstack** (JavaScript, APIs, Markup), onde:

1. **Frontend (React)** - Aplicação Single Page Application (SPA)
   - Roda no navegador do usuário
   - Faz requisições HTTP diretas para o Supabase
   - Pode ser servida como arquivos estáticos (HTML, CSS, JS)

2. **Backend (Supabase)** - Fornecido como serviço
   - API REST automática
   - Autenticação integrada
   - Banco de dados PostgreSQL gerenciado
   - Row Level Security (RLS)

### 📊 Fluxo de Dados

```
┌─────────────────┐         HTTP/REST         ┌──────────────┐
│   Navegador     │ ───────────────────────►  │   Supabase   │
│   (React App)   │                           │   (Backend)  │
│                 │ ◄─────────────────────── │   (Database) │
└─────────────────┘         JSON Response      └──────────────┘
```

### 🚀 O que você precisa:

**Para Desenvolvimento:**
- ✅ Node.js (para rodar o Vite dev server local)
- ✅ Supabase (banco de dados na nuvem)
- ❌ **NÃO precisa** de servidor backend próprio

**Para Produção:**
- ✅ Hospedagem estática (Vercel, Netlify, GitHub Pages, etc.)
- ✅ Supabase (já está na nuvem)
- ❌ **NÃO precisa** de servidor backend próprio

**Opções de Hospedagem Estática (Gratuitas):**
- **Vercel** (recomendado) - Deploy automático do Git
- **Netlify** - Deploy automático do Git
- **GitHub Pages** - Hospedagem gratuita para repositórios públicos
- **Cloudflare Pages** - CDN global gratuita
- **Firebase Hosting** - Hospedagem do Google

**Nota:** Tecnicamente, você precisa de algo para servir os arquivos HTML/JS/CSS, mas os serviços acima fazem isso automaticamente sem necessidade de configurar servidor próprio.

## 🛠 Tecnologias

### Frontend
- **React 18** - Biblioteca JavaScript para construção de interfaces
- **TypeScript** - Tipagem estática para JavaScript
- **Vite** - Build tool e dev server ultra-rápido
- **Tailwind CSS** - Framework CSS utility-first
- **shadcn/ui** - Componentes UI acessíveis e customizáveis
- **React Router** - Roteamento para aplicações React
- **React Hook Form** - Biblioteca para gerenciamento de formulários
- **Zod** - Validação de esquemas TypeScript-first

### Backend & Database
- **Supabase** - Backend-as-a-Service (BaaS)
  - PostgreSQL database
  - Authentication
  - Row Level Security (RLS)
  - Real-time subscriptions

### Outras Ferramentas
- **Lucide React** - Ícones
- **date-fns** - Manipulação de datas
- **Sonner** - Toast notifications
- **TanStack Query** - Gerenciamento de estado do servidor

## 📦 Requisitos

Antes de começar, certifique-se de ter instalado:

- **Node.js** 18.x ou superior
- **npm** ou **bun** (gerenciador de pacotes)
- Conta no **Supabase** (para o banco de dados)

## 🚀 Instalação

### 1. Clone o repositório

```bash
git clone <URL_DO_REPOSITORIO>
cd gcti
```

### 2. Instale as dependências

Usando npm:
```bash
npm install
```

Ou usando bun:
```bash
bun install
```

### 3. Configure as variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```env
VITE_SUPABASE_PROJECT_ID="nmisrxdladivuscombrj"
VITE_SUPABASE_PUBLISHABLE_KEY="sua_chave_publica_aqui"
VITE_SUPABASE_URL="https://nmisrxdladivuscombrj.supabase.co"
```

**Onde encontrar essas informações:**

1. Acesse o [Dashboard do Supabase](https://supabase.com/dashboard)
2. Selecione seu projeto
3. Vá em **Settings** > **API**
4. Copie:
   - **URL** → `VITE_SUPABASE_URL`
   - **Project ID** → `VITE_SUPABASE_PROJECT_ID`
   - **anon/public key** → `VITE_SUPABASE_PUBLISHABLE_KEY`

### 4. Inicie o servidor de desenvolvimento

```bash
npm run dev
```

A aplicação estará disponível em `http://localhost:8080`

## ⚙️ Scripts Disponíveis

No diretório do projeto, você pode executar:

### `npm run dev`
Inicia o servidor de desenvolvimento com hot-reload na porta 8080.

### `npm run build`
Cria uma build de produção otimizada na pasta `dist/`.

### `npm run build:dev`
Cria uma build de desenvolvimento.

### `npm run preview`
Visualiza a build de produção localmente.

### `npm run lint`
Executa o ESLint para verificar problemas no código.

## 🗄️ Configuração do Banco de Dados

### 1. Criar Projeto no Supabase

1. Acesse [supabase.com](https://supabase.com)
2. Crie uma nova conta ou faça login
3. Crie um novo projeto
4. Anote o **Project ID** e as **API keys**

### 2. Executar Migrações SQL

Acesse o **SQL Editor** no dashboard do Supabase e execute o seguinte script:

```sql
-- Criar tabela de perfis de usuários
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Trigger para criar perfil automaticamente ao criar usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Criar tabela de fornecedores
CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, name)
);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own suppliers"
  ON public.suppliers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own suppliers"
  ON public.suppliers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own suppliers"
  ON public.suppliers FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own suppliers"
  ON public.suppliers FOR DELETE
  USING (auth.uid() = user_id);

-- Criar tabela de contas
CREATE TABLE public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  end_date DATE,
  is_delivered BOOLEAN NOT NULL DEFAULT FALSE,
  delivered_at TIMESTAMPTZ,
  invoice_numbers TEXT[],
  recipient TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own accounts"
  ON public.accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own accounts"
  ON public.accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own accounts"
  ON public.accounts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own accounts"
  ON public.accounts FOR DELETE
  USING (auth.uid() = user_id);

-- Função para calcular data de vencimento (2 dias úteis após emissão)
CREATE OR REPLACE FUNCTION public.calculate_due_date(issue_date DATE)
RETURNS DATE
LANGUAGE plpgsql
AS $$
DECLARE
  business_days INT := 0;
  calc_date DATE := issue_date;
BEGIN
  WHILE business_days < 2 LOOP
    calc_date := calc_date + 1;
    -- Pular fins de semana (6 = Sábado, 0 = Domingo)
    IF EXTRACT(DOW FROM calc_date) NOT IN (0, 6) THEN
      business_days := business_days + 1;
    END IF;
  END LOOP;
  RETURN calc_date;
END;
$$;

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_accounts_updated_at
  BEFORE UPDATE ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
```

### 3. String de Conexão PostgreSQL

Para acesso direto ao banco de dados PostgreSQL, use a seguinte string de conexão:

```
postgresql://postgres:d6rF76N4vBEcOGum7z1@db.wlipynhbebhthznkkuli.supabase.co:5432/postgres
```

**⚠️ Importante:** Mantenha essa string segura e não a compartilhe publicamente. Ela contém credenciais sensíveis do banco de dados.

**Informações da conexão:**
- **Host:** `db.wlipynhbebhthznkkuli.supabase.co`
- **Porta:** `5432`
- **Database:** `postgres`
- **User:** `postgres`
- **Password:** `d6rF76N4vBEcOGum7z1`

## 📁 Estrutura do Projeto

```
gcti/
├── public/                 # Arquivos estáticos
├── src/
│   ├── components/        # Componentes React reutilizáveis
│   │   ├── ui/            # Componentes shadcn/ui
│   │   ├── AccountCard.tsx
│   │   ├── AddAccountDialog.tsx
│   │   ├── MarkDeliveredDialog.tsx
│   │   └── Navbar.tsx
│   ├── hooks/             # Custom hooks
│   ├── integrations/      # Integrações externas
│   │   └── supabase/      # Cliente e tipos Supabase
│   ├── lib/               # Utilitários
│   ├── pages/             # Páginas da aplicação
│   │   ├── Auth.tsx       # Página de autenticação
│   │   ├── Index.tsx      # Dashboard principal
│   │   ├── History.tsx    # Histórico de contas
│   │   └── NotFound.tsx   # Página 404
│   ├── App.tsx            # Componente raiz
│   ├── main.tsx           # Ponto de entrada
│   └── index.css          # Estilos globais
├── supabase/
│   ├── config.toml        # Configuração do Supabase
│   └── migrations/        # Migrações SQL
├── .env                   # Variáveis de ambiente (não versionado)
├── package.json           # Dependências e scripts
├── vite.config.ts         # Configuração do Vite
├── tailwind.config.ts     # Configuração do Tailwind
└── tsconfig.json          # Configuração do TypeScript
```

## 🚢 Deploy

### ⚠️ Importante: Não precisa de servidor!

Este projeto é uma **SPA (Single Page Application)** que pode ser hospedada como **arquivos estáticos**. O backend já está no Supabase (na nuvem), então você só precisa hospedar os arquivos HTML, CSS e JavaScript.

### 🎯 Qual escolher?

**Problemas com Vercel?** Use uma dessas alternativas igualmente boas:

1. **Netlify** ⭐ (Recomendado se Vercel der problema)
   - Mais fácil para criar conta (email/password)
   - Interface similar ao Vercel
   - Deploy automático via Git

2. **Cloudflare Pages** (Mais rápido, menos configuração)
   - CDN ultra-rápida
   - Deploy via Git muito simples
   - Gratuito sem limites

3. **GitHub Pages** (Mais simples, sem conta extra)
   - Se o projeto já está no GitHub
   - Sem criar conta em outro serviço
   - Totalmente gratuito

---

### Opção 1: Vercel (Recomendado - Mais Fácil) ⭐

**Vantagens:** Deploy automático, CDN global, HTTPS gratuito, fácil integração com Git

#### Via Dashboard (Mais Fácil):
1. Acesse [vercel.com](https://vercel.com) e faça login com GitHub
2. Clique em "Add New Project"
3. Conecte seu repositório Git
4. Configure:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. Adicione as variáveis de ambiente:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PROJECT_ID`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
6. Clique em "Deploy"
7. Pronto! Sua aplicação estará no ar em ~2 minutos

#### Via CLI:
```bash
# Instalar CLI
npm i -g vercel

# Fazer deploy (na primeira vez vai pedir para fazer login)
vercel

# Deploy para produção
vercel --prod
```

### Opção 2: Netlify (Alternativa Recomendada!) ⭐⭐⭐

**Vantagens:** 
- ✅ Deploy automático via Git
- ✅ CDN global
- ✅ HTTPS gratuito
- ✅ **Fácil criar conta (email/password, sem depender de conta social)**
- ✅ Interface intuitiva
- ✅ Similar ao Vercel

#### Via Dashboard (Recomendado):

1. **Criar conta:**
   - Acesse [netlify.com](https://netlify.com)
   - Clique em "Sign up"
   - **Pode criar conta com email/password** (não precisa de conta social!)
   - Confirme o email

2. **Conectar repositório:**
   - No dashboard, clique em "Add new site" > "Import an existing project"
   - Escolha seu provedor Git (GitHub, GitLab, Bitbucket)
   - Autorize a conexão
   - Selecione seu repositório `gcti`

3. **Configurar build:**
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
   - Clique em "Show advanced" e configure:
     - **Node version:** 18.x ou superior
   - Clique em "Deploy site"

4. **Configurar variáveis de ambiente:**
   - Após o deploy, vá em "Site settings" > "Environment variables"
   - Adicione:
     - `VITE_SUPABASE_URL` = `https://nmisrxdladivuscombrj.supabase.co`
     - `VITE_SUPABASE_PROJECT_ID` = `nmisrxdladivuscombrj`
     - `VITE_SUPABASE_PUBLISHABLE_KEY` = (sua chave pública do Supabase)
   - Clique em "Trigger deploy" para fazer novo deploy com as variáveis

5. **Pronto!** Sua aplicação estará em `https://seu-site.netlify.app`

#### Via CLI (Alternativa):

```bash
# Instalar CLI globalmente
npm i -g netlify-cli

# Login (vai abrir navegador para autenticar)
netlify login

# Ir para a pasta do projeto
cd C:\GCTI\gcti

# Fazer build primeiro
npm run build

# Deploy para produção
netlify deploy --prod --dir=dist

# Durante o deploy, configure:
# - Build command: npm run build
# - Publish directory: dist
```

### Opção 3: GitHub Pages + Supabase (Completo) 🚀

**Vantagens:** 
- ✅ Totalmente gratuito
- ✅ Integração direta com GitHub
- ✅ Sem necessidade de criar conta em outro serviço
- ✅ Deploy automático via GitHub Actions (opcional)
- ✅ Ideal se seu projeto já está no GitHub

#### 🚀 Guia Rápido (TL;DR)

```bash
# 1. Instalar gh-pages
npm install --save-dev gh-pages

# 2. Editar vite.config.ts e adicionar: base: '/nome-do-repo/'

# 3. Criar .env.production com variáveis do Supabase

# 4. Adicionar no package.json: "deploy": "npm run build && gh-pages -d dist"

# 5. Fazer deploy
npm run deploy

# 6. Ativar GitHub Pages em Settings > Pages
```

#### ⚠️ Importante: Configuração Necessária

GitHub Pages **não suporta variáveis de ambiente** no build tradicional. Você precisa configurar as variáveis diretamente no código ou usar GitHub Secrets com GitHub Actions.

#### Método 1: Deploy Manual (Mais Simples)

**Passo 1: Instalar dependências**

```bash
npm install --save-dev gh-pages
```

**Passo 2: Descobrir o nome do repositório**

Você precisa saber o nome exato do seu repositório no GitHub. Por exemplo:
- Se a URL é `https://github.com/seu-usuario/gcti`, o nome é `gcti`

**Passo 3: Configurar o `vite.config.ts`**

Edite o arquivo `vite.config.ts` e adicione o `base`:

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: '/gcti/', // ⚠️ SUBSTITUA 'gcti' pelo nome do SEU repositório no GitHub
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
```

**Passo 4: Configurar variáveis de ambiente para produção**

Como GitHub Pages não suporta variáveis de ambiente, você tem duas opções:

**Opção A: Criar arquivo `.env.production` (Recomendado)**

Crie um arquivo `.env.production` na raiz do projeto:

```env
VITE_SUPABASE_PROJECT_ID="nmisrxdladivuscombrj"
VITE_SUPABASE_PUBLISHABLE_KEY="sua_chave_publica_aqui"
VITE_SUPABASE_URL="https://nmisrxdladivuscombrj.supabase.co"
```

⚠️ **Importante sobre `.env.production`:**
- A chave pública do Supabase (`VITE_SUPABASE_PUBLISHABLE_KEY`) **pode ser exposta** publicamente sem problemas de segurança
- Porém, por padrão, o `.gitignore` já ignora arquivos `.env`
- **Opção 1:** Se quiser manter privado, deixe no `.gitignore` e configure manualmente antes de cada deploy
- **Opção 2:** Se quiser versionar (recomendado para chaves públicas), adicione `.env.production` ao repositório:
  ```bash
  git add -f .env.production
  git commit -m "Add production env file"
  ```
- **Opção 3:** Use GitHub Secrets (Método 2) para máxima segurança

**Opção B: Usar GitHub Secrets com GitHub Actions (Mais Seguro)**

Veja o Método 2 abaixo.

**Passo 5: Adicionar script de deploy no `package.json`**

Adicione o script `deploy`:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "build:dev": "vite build --mode development",
    "lint": "eslint .",
    "preview": "vite preview",
    "deploy": "npm run build && gh-pages -d dist"
  }
}
```

**Passo 6: Fazer o deploy**

```bash
npm run deploy
```

Isso vai:
1. Fazer o build da aplicação
2. Criar uma branch `gh-pages` automaticamente
3. Fazer push dos arquivos para o GitHub

**Passo 7: Ativar GitHub Pages**

1. Vá para seu repositório no GitHub
2. Clique em **Settings** (Configurações)
3. No menu lateral, clique em **Pages**
4. Em **Source**, selecione:
   - **Branch:** `gh-pages`
   - **Folder:** `/ (root)`
5. Clique em **Save**
6. Aguarde alguns minutos para o GitHub processar
7. Sua aplicação estará em: `https://seu-usuario.github.io/gcti/`

#### Método 2: GitHub Actions (Deploy Automático)

Crie um arquivo `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches:
      - main  # ou 'master', dependendo da sua branch principal

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    permissions:
      contents: read
      pages: write
      id-token: write
    
    steps:
      - name: Checkout
        uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_PROJECT_ID: ${{ secrets.VITE_SUPABASE_PROJECT_ID }}
          VITE_SUPABASE_PUBLISHABLE_KEY: ${{ secrets.VITE_SUPABASE_PUBLISHABLE_KEY }}
        run: npm run build
      
      - name: Setup Pages
        uses: actions/configure-pages@v2
      
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v1
        with:
          path: './dist'
      
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v1
```

**Configurar Secrets no GitHub:**

1. Vá para o repositório no GitHub
2. Clique em **Settings** > **Secrets and variables** > **Actions**
3. Clique em **New repository secret**
4. Adicione os 3 secrets:
   - `VITE_SUPABASE_URL` = `https://nmisrxdladivuscombrj.supabase.co`
   - `VITE_SUPABASE_PROJECT_ID` = `nmisrxdladivuscombrj`
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = (sua chave pública)

**Ativar GitHub Pages (Actions):**

1. Settings > Pages
2. Source: **GitHub Actions**
3. Pronto! Toda vez que fizer push na branch `main`, o deploy acontece automaticamente.

#### Resumo GitHub Pages + Supabase

✅ **O que você tem:**
- Código no GitHub
- Supabase configurado

✅ **O que fazer:**
1. Configurar `base` no `vite.config.ts` com o nome do repositório
2. Escolher Método 1 (manual) ou Método 2 (automático com Actions)
3. Fazer deploy
4. Ativar GitHub Pages nas configurações

❌ **Limitação:**
- GitHub Pages não suporta variáveis de ambiente no build tradicional
- Solução: usar `.env.production` ou GitHub Secrets (Método 2)

🎯 **Resultado:**
- URL: `https://seu-usuario.github.io/nome-do-repo/`
- Deploy automático a cada push (se usar GitHub Actions)

### Opção 4: Cloudflare Pages (Muito Rápido) ⚡

**Vantagens:** 
- ✅ CDN ultra-rápida (mais rápida do mundo!)
- ✅ Gratuito ilimitado
- ✅ Integração com Git
- ✅ **Pode criar conta com email/password**

1. **Criar conta:**
   - Acesse [pages.cloudflare.com](https://pages.cloudflare.com)
   - Clique em "Sign up" (pode usar email/password)

2. **Conectar repositório:**
   - Clique em "Create a project"
   - Escolha seu provedor Git (GitHub, GitLab, etc.)
   - Autorize e selecione o repositório `gcti`

3. **Configurar build:**
   - **Framework preset:** Vite (ou deixe "None" e configure manualmente)
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Node version:** 18 (ou superior)

4. **Adicionar variáveis de ambiente:**
   - Após criar o projeto, vá em "Settings" > "Environment variables"
   - Adicione as 3 variáveis do Supabase

5. **Deploy automático!** 
   - Toda vez que fizer push no Git, o deploy acontece automaticamente
   - URL: `https://seu-projeto.pages.dev`

### Opção 5: Deploy Manual (Upload de Arquivos)

**Use quando:** Não quer criar conta em serviços ou prefere mais controle

**Onde hospedar:**
- **GitHub Pages** (gratuito, já tem o repositório)
- **AWS S3** (gratuito até certo limite)
- **Qualquer servidor web** (Apache, Nginx)
- **Qualquer provedor de hospedagem**

**Passo a passo:**

1. **Fazer build:**
```bash
npm run build
```

2. **A pasta `dist/` terá todos os arquivos:**
```
dist/
├── index.html
├── assets/
│   ├── index-[hash].js
│   └── index-[hash].css
└── ...
```

3. **Upload dos arquivos:**
   - Faça upload de **todo o conteúdo** da pasta `dist/` para o servidor
   - **Importante:** O `index.html` deve estar na raiz

4. **Configurar variáveis de ambiente:**
   - Como é deploy manual, você precisa editar o arquivo `.env` antes do build
   - Ou editar o código diretamente (não recomendado)

### Opção 6: Firebase Hosting

**Vantagens:** Gratuito, rápido, do Google

1. Instale o Firebase CLI:
```bash
npm i -g firebase-tools
```

2. Faça login:
```bash
firebase login
```

3. Inicialize o projeto:
```bash
firebase init hosting
```

4. Configure:
   - **Public directory:** `dist`
   - **Single-page app:** Yes

5. Build e deploy:
```bash
npm run build
firebase deploy
```

### Build Local para Teste

Antes de fazer deploy, teste a build localmente:

```bash
# Criar build de produção
npm run build

# Testar a build localmente
npm run preview

# Acesse http://localhost:4173 para testar
```

### Variáveis de Ambiente no Deploy

⚠️ **Importante:** Configure as variáveis de ambiente na plataforma de deploy:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PROJECT_ID`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

**Como encontrar essas variáveis:**
1. Dashboard Supabase > Settings > API
2. Copie os valores para as variáveis de ambiente na plataforma de deploy

### Resumo: O que você precisa?

✅ **Sim:**
- Conta no Supabase (já tem)
- Repositório Git (já tem)
- **Conta gratuita em um desses serviços:**
  - ⭐ **Netlify** (recomendado - mais fácil criar conta)
  - Cloudflare Pages (muito rápido)
  - GitHub Pages (se projeto público)
  - Firebase Hosting
  - Ou qualquer outro serviço de hospedagem estática

❌ **Não precisa:**
- Servidor próprio
- Backend customizado
- Banco de dados próprio
- Configuração de servidor web (nginx, Apache, etc.)
- Conta social conectada (pode usar email/password na maioria)

### 🎯 Recomendação Final

**Se seu projeto já está no GitHub:**

1. **GitHub Pages + Supabase** ⭐ (Recomendado para você!)
   - Já tem o código no GitHub
   - Sem criar conta em outro serviço
   - Totalmente gratuito
   - Deploy automático com GitHub Actions (opcional)
   - Veja instruções completas na [Opção 3: GitHub Pages](#opção-3-github-pages--supabase-completo-)

2. **Netlify** - Se preferir interface mais visual
3. **Cloudflare Pages** - Se quiser a CDN mais rápida

**Se teve problema com Vercel (conta social):**

1. **GitHub Pages** - Se projeto já está no GitHub (sem conta extra!)
2. **Netlify** - Mais similar ao Vercel, permite criar conta com email
3. **Cloudflare Pages** - Muito rápido e simples

**Todas as opções são gratuitas e fazem exatamente a mesma coisa!**

O Supabase já faz todo o trabalho de backend! Você só precisa hospedar os arquivos estáticos do frontend.

## 🔐 Segurança

### Row Level Security (RLS)

O banco de dados utiliza Row Level Security para garantir que:

- Usuários só podem ver e modificar seus próprios dados
- Cada conta e fornecedor está associado a um usuário específico
- As políticas RLS são aplicadas automaticamente pelo Supabase

### Variáveis de Ambiente

⚠️ **Nunca** commite o arquivo `.env` no repositório. Ele contém informações sensíveis.

O arquivo `.gitignore` já está configurado para ignorar o `.env`.

## 📝 Funcionalidades

### Autenticação
- Login e registro de usuários
- Gerenciamento de sessão
- Proteção de rotas

### Gerenciamento de Contas
- Cadastro de contas a pagar
- Associação com fornecedores
- Controle de datas de vencimento
- Marcação de contas como entregues
- Histórico completo

### Gerenciamento de Fornecedores
- Cadastro de fornecedores
- Associação única por usuário
- Relacionamento com contas

## 🤝 Contribuindo

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto é privado e proprietário.

## 📞 Suporte

Para dúvidas ou problemas:
- Abra uma issue no repositório
- Entre em contato com a equipe de desenvolvimento

---

Desenvolvido com ❤️ usando React, TypeScript e Supabase
