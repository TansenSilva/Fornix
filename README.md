# Meus Fornecedores

Aplicativo web (PWA) **mobile-first** para gerenciar uma agenda/catálogo pessoal de fornecedores.
O fluxo principal é o mais curto possível:

```
ABRIR O APP → PESQUISAR "PELÍCULA" → VER QUEM VENDE PELÍCULAS → ABRIR O WHATSAPP DO FORNECEDOR
```

## Sumário

1. [Objetivo](#1-objetivo)
2. [Tecnologias](#2-tecnologias)
3. [Requisitos](#3-requisitos)
4. [Instalação](#4-instalação)
5. [Configuração do Supabase](#5-configuração-do-supabase)
6. [Variáveis de ambiente](#6-variáveis-de-ambiente)
7. [Execução local](#7-execução-local)
8. [Migrations](#8-migrations)
9. [Deploy na Vercel](#9-deploy-na-vercel)
10. [Instalação da PWA no Android](#10-instalação-da-pwa-no-android)
11. [Segurança das senhas dos portais](#11-segurança-das-senhas-dos-portais)
12. [Estrutura do projeto](#12-estrutura-do-projeto)
13. [Banco de dados](#13-banco-de-dados)
14. [Como a busca funciona](#14-como-a-busca-funciona)
15. [Personalizar nome e ícone](#15-personalizar-nome-e-ícone)
16. [Limitações da versão 1 e próximos passos](#16-limitações-da-versão-1-e-próximos-passos)

---

## 1. Objetivo

Cadastrar fornecedores (contato, WhatsApp, site, portal de compras, produtos, marcas, categorias e
observações) e encontrá-los rapidamente com **uma única busca global** por nome do fornecedor,
vendedor, produto, marca, categoria ou cidade — sem acentos e sem diferenciar maiúsculas
(`pelicula` encontra **Película**, `carrega` encontra **Carregadores**).

Funcionalidades da versão 1:

- Login (Supabase Auth, e-mail + senha) — todas as páginas exigem autenticação
- Cadastrar, editar e excluir fornecedor (com confirmação)
- Nome, nome fantasia, CNPJ/CPF, vendedor, WhatsApp, telefone, e-mail, site, Instagram, observações
- Endereço com preenchimento automático pelo CEP (ViaCEP, com BrasilAPI como alternativa)
- Máscaras enquanto digita: telefone/WhatsApp, CNPJ/CPF (com validação, inclusive CNPJ alfanumérico) e CEP
- Portal de compras: URL, login e **senha criptografada** (mostrar/ocultar, copiar)
- Produtos e marcas como tags, com **autocomplete** que evita duplicidade ("Película" × "pelicula")
- Categorias configuráveis (criar, renomear, excluir) com seleção múltipla
- Busca global enquanto digita (debounce de 300 ms, uma consulta por busca)
- Filtros: Todos/Favoritos, categoria, marca, estado; ordenação (favoritos primeiro, A-Z, recentes)
- Favoritos (estrela no card)
- Ações rápidas: WhatsApp (`wa.me` com número normalizado), ligar, e-mail, site, portal, editar
- Copiar WhatsApp, e-mail, login e senha com toast "Copiado!"
- Aviso de possível duplicidade (nome parecido, mesmo WhatsApp, e-mail ou site)
- Indicadores simples: fornecedores, favoritos, categorias
- PWA instalável (manifest, ícones, modo standalone, página offline)
- Layout mobile-first: 1 coluna no celular, 2 no tablet, 3 no desktop
- **Listas de compras / pedidos**: itens em formato de planilha (produto, quantidade, valor
  unitário, subtotal) com total em tempo real, status (rascunho, pedido feito, recebido,
  cancelado), itens conferidos, duplicar lista, copiar como texto e enviar pelo WhatsApp do
  fornecedor; histórico de pedidos na página de cada fornecedor

## 2. Tecnologias

| Camada        | Tecnologia                                             |
| ------------- | ------------------------------------------------------ |
| Framework     | Next.js 16 (App Router, Server Components, Server Actions) |
| Linguagem     | TypeScript (strict)                                    |
| Estilo        | Tailwind CSS 4                                         |
| Ícones        | lucide-react                                           |
| Backend       | Supabase (PostgreSQL + Auth + RLS)                     |
| Integração    | `@supabase/ssr` + `@supabase/supabase-js`              |
| Deploy        | Vercel                                                 |

Nenhuma outra dependência de runtime além de `server-only`.

## 3. Requisitos

- Node.js **20.9+** (recomendado 22 LTS) e npm
- Conta gratuita no [Supabase](https://supabase.com)
- Conta na [Vercel](https://vercel.com) e no GitHub (para o deploy)
- Opcional: [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started) + Docker, para rodar o banco localmente

## 4. Instalação

```bash
git clone https://github.com/SEU-USUARIO/fornix.git
cd fornix
npm install
cp .env.example .env.local   # depois preencha os valores (seção 6)
```

## 5. Configuração do Supabase

1. Crie um projeto em <https://supabase.com/dashboard> (região São Paulo, se possível).
   Use um **projeto separado** de outros apps (as cotas do plano gratuito são por projeto).
   Na criação:
   - **Database password:** clique em *Generate a password* e guarde-a (o app não usa, mas é
     a senha de administrador do banco).
   - **Enable Data API:** marcado (obrigatório — o app usa a API REST).
   - **Automatically expose new tables:** pode deixar **desmarcado** (recomendado). A migration
     concede explicitamente as permissões necessárias.
   - **Enable automatic RLS:** opcional — a migration já ativa o RLS em todas as tabelas.
2. **Aplique a migration** (seção 8). O jeito mais simples: abra **SQL Editor → New query**, cole
   todo o conteúdo de `supabase/migrations/20260926000000_initial_schema.sql` e clique em **Run**.
3. **Desative cadastros públicos** (o app é privado):
   **Authentication → Sign In / Providers → "Allow new users to sign up" = desligado**.
4. **Crie o usuário administrador**: **Authentication → Users → Add user → Create new user**,
   informe e-mail e senha e marque **Auto Confirm User**.
   Ao criar o usuário, um trigger cria o `profile` e as categorias padrão
   (Celulares, Capas, Películas, Carregadores, Cabos, Áudio, Peças, Ferramentas, Acessórios,
   Informática, Outros) — todas editáveis depois em **Categorias**.
5. Em **Authentication → URL Configuration**, defina o **Site URL** com a URL da Vercel
   (ex.: `https://meus-fornecedores.vercel.app`).
6. Copie a **Project URL** e a **Publishable key** (ou a antiga *anon key*) em
   **Project Settings → API Keys** / botão **Connect**.

> Para ter mais usuários no futuro basta criá-los em **Authentication → Users**. Cada um verá
> somente os próprios fornecedores (RLS por `user_id`).

## 6. Variáveis de ambiente

| Variável | Onde usar | Descrição |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | navegador + servidor | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | navegador + servidor | Chave pública (publishable/anon). Segura no navegador porque tudo é protegido por RLS. `NEXT_PUBLIC_SUPABASE_ANON_KEY` também é aceita. |
| `CREDENTIALS_ENCRYPTION_KEY` | **somente servidor** | 32 bytes em base64 usados para criptografar as senhas dos portais |

Gerar a chave de criptografia:

```bash
openssl rand -base64 32
# ou
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

> ⚠️ **Guarde uma cópia segura da `CREDENTIALS_ENCRYPTION_KEY`** (ex.: gerenciador de senhas).
> Se ela for perdida ou trocada, as senhas já salvas não poderão ser descriptografadas
> (os demais dados continuam intactos; basta cadastrar as senhas de novo).
>
> Nunca use a `service_role` key neste projeto — ela não é necessária.

## 7. Execução local

```bash
npm run dev        # http://localhost:3000
npm run lint       # ESLint
npm run typecheck  # TypeScript
npm run build      # build de produção
npm start          # servir o build
```

Para testar no celular na mesma rede: `npm run dev -- -H 0.0.0.0` e acesse `http://IP-DO-PC:3000`.
(O service worker só é registrado em produção — use `npm run build && npm start` para testar a PWA.)

### Banco local (opcional)

Com Docker e a Supabase CLI:

```bash
npx supabase start          # sobe Postgres/Auth/API locais e aplica as migrations
npx supabase status         # mostra URL e chaves locais para o .env.local
```

O `supabase/config.toml` já vem com cadastro público desativado. Crie um usuário local pelo
Studio (<http://127.0.0.1:54323>) ou pela API admin.

## 8. Migrations

Os arquivos ficam em `supabase/migrations/` e devem ser aplicados **em ordem**, cada um uma vez:

1. `20260926000000_initial_schema.sql` — extensões (`unaccent`, `pg_trgm`), tabelas, índices,
   foreign keys, triggers da busca, funções RPC (`save_supplier`, `find_similar_suppliers`,
   `cleanup_orphan_tags`), categorias padrão e políticas RLS.
2. `20260927000000_supplier_document_address.sql` — CNPJ/CPF (inclui o CNPJ alfanumérico) e
   endereço completo (CEP, rua, número, complemento, bairro); aviso de duplicidade por CNPJ/CPF.
3. `20260928000000_purchase_lists.sql` — listas de compras/pedidos (`purchase_lists`,
   `purchase_list_items`, view `purchase_list_summaries` com totais), com RLS.

Dica para copiar um arquivo grande: abra-o no GitHub, clique em **Raw**, use Ctrl+A / Ctrl+C e
cole no SQL Editor.

Formas de aplicar:

**A) SQL Editor (mais simples):** cole o arquivo no SQL Editor do Supabase e execute.

**B) Supabase CLI:**

```bash
npx supabase login
npx supabase link --project-ref SEU_PROJECT_REF
npx supabase db push
```

Novas alterações de banco devem ser feitas em **novos arquivos** de migration
(`npx supabase migration new nome_da_mudanca`), nunca editando os já aplicados.

## 9. Deploy na Vercel

1. Suba o código para o GitHub:

   ```bash
   git remote add origin https://github.com/SEU-USUARIO/fornix.git   # se ainda não existir
   git push -u origin main
   ```

   O `.gitignore` já impede o envio de `node_modules`, `.env*` (exceto `.env.example`) e `.vercel`.

2. Em <https://vercel.com/new>, **Import** o repositório. O framework **Next.js** é detectado
   automaticamente (não precisa alterar build/output).
3. Em **Environment Variables**, adicione as três variáveis da seção 6 (Production, Preview e
   Development).
4. Clique em **Deploy**.
5. Copie a URL gerada e configure-a como **Site URL** no Supabase (seção 5, passo 5).

Cada `git push` na branch principal gera um novo deploy automaticamente.

## 10. Instalação da PWA no Android

1. Abra a URL da Vercel no **Chrome** do Android e faça login.
2. Toque no menu **⋮** → **Instalar app** (ou **Adicionar à tela inicial**).
   Em alguns aparelhos o Chrome já mostra um banner "Instalar".
3. O ícone **Fornecedores** aparece na tela inicial e o app abre em tela cheia (modo standalone).

No iPhone: Safari → botão **Compartilhar** → **Adicionar à Tela de Início**.

O app precisa de internet para mostrar os dados (eles nunca são guardados em cache no aparelho);
sem conexão, aparece uma tela "Sem conexão".

## 11. Segurança das senhas dos portais

As senhas dos portais de fornecedores **nunca são armazenadas em texto puro**.

- **Criptografia na aplicação (servidor):** ao salvar, a Server Action criptografa a senha com
  **AES-256-GCM** (`node:crypto`) usando a chave `CREDENTIALS_ENCRYPTION_KEY`, que existe
  **somente no servidor** (Vercel). O banco recebe apenas o texto cifrado
  (`v1:<iv>:<tag>:<ciphertext>`) na coluna `suppliers.portal_password_encrypted`.
- **IV aleatório** de 12 bytes por senha e **tag de autenticação** (GCM) — qualquer alteração no
  valor cifrado é detectada.
- **AAD = id do usuário:** um valor cifrado copiado para outra conta não pode ser decifrado.
- **Separação de segredos:** quem tiver acesso apenas ao banco (backup vazado, SQL Editor) não
  consegue ler as senhas sem a chave; quem tiver apenas a chave não tem os dados.
- **Não vai para o HTML:** as páginas nunca carregam a senha — só o indicador
  `has_portal_password`. A senha é buscada sob demanda, via Server Action autenticada
  (sessão validada + RLS garante que o registro é do usuário), apenas quando se toca no
  **olho** ou em **Copiar senha**. Ela é ocultada novamente após 30 segundos.
- **Edição:** o formulário nunca é preenchido com a senha atual; é possível manter, alterar ou
  remover.
- **Sem logs:** o código não registra senhas nem o conteúdo das requisições.
- **Prefixo de versão** (`v1:`) permite trocar de chave/algoritmo no futuro sem ambiguidade.

Outras medidas:

- **RLS** em todas as tabelas: `authenticated` só acessa linhas com `user_id = auth.uid()`;
  o papel `anon` não tem nenhum privilégio.
- **FKs compostas** `(id, user_id)` nas tabelas de relacionamento impedem ligar um fornecedor a
  produtos/marcas/categorias de outro usuário.
- **Proxy** (antigo middleware) valida o JWT e redireciona para `/login` qualquer rota privada.
- Links externos só aceitam `http(s)` e abrem com `rel="noopener noreferrer"`.
- `robots: noindex` para o app não ser indexado.

## 12. Estrutura do projeto

```
app/
  actions/            Server Actions (auth, salvar fornecedor, revelar senha)
  categorias/         Gerenciar categorias
  fornecedores/
    novo/             Cadastro
    [id]/             Detalhes
    [id]/editar/      Edição
  login/              Tela de login
  layout.tsx          Layout raiz (metadados, viewport, toast, service worker)
  manifest.ts         Manifest da PWA (/manifest.webmanifest)
  page.tsx            Tela principal (busca + lista)
components/
  layout/             AppHeader, Fab (+), PageContainer, ServiceWorkerRegister
  suppliers/          SupplierBrowser, SupplierCard, SupplierSearch, SupplierFilters,
                      SupplierForm, FormSection, CredentialField, CopyButton,
                      DuplicateWarning, FavoriteButton, StatsBar, SupplierDetailActions
  tags/               TagInput, ProductTagInput, BrandTagInput, CategorySelector, CategoryManager
  ui/                 Modal, ConfirmDialog, ActionMenu, Toast, EmptyState, ErrorState, Skeleton, Tag…
hooks/                useDebouncedValue, useCopy, useDuplicateCheck
lib/
  app-config.ts       Nome, cores e país padrão do app
  env.ts              Leitura validada das variáveis de ambiente
  data/               Consultas ao Supabase (independentes da UI)
  security/crypto.ts  Criptografia AES-256-GCM (somente servidor)
  supabase/           Clientes browser/servidor e renovação de sessão no proxy
  validation/         Validação e normalização do formulário
types/                Tipos de domínio (Supplier, Product, Brand, Category, Contact…) e linhas do banco
utils/                Telefone/WhatsApp, URL, texto (acentos), estados
proxy.ts              Proteção de rotas (Next.js 16 "proxy" = antigo middleware)
public/               Ícones, service worker (sw.js), página offline
supabase/             config.toml e migrations
scripts/              Geração dos ícones PNG
```

A interface nunca fala com o banco diretamente: tudo passa por `lib/data/*`, que recebe o
cliente Supabase (navegador ou servidor) como parâmetro.

## 13. Banco de dados

```
auth.users ─┬─ profiles (1:1)
            ├─ suppliers ──┬── supplier_products ── products
            │              ├── supplier_brands ──── brands
            │              └── supplier_categories ─ categories
            ├─ products / brands / categories (catálogo por usuário)
```

- `suppliers`: dados do fornecedor, contato principal, portal (senha cifrada), favorito,
  `name_normalized` e `search_document` (busca).
- `products`, `brands`, `categories`: nomes únicos por usuário **ignorando acento e caixa**
  (`unique (user_id, name_normalized)`), então "Película" e "pelicula" são o mesmo item.
- Tabelas N:N com chave primária composta e `on delete cascade`.
- Produtos e marcas que ficam sem nenhum fornecedor são removidos automaticamente
  (não poluem o autocomplete). Categorias ficam até serem excluídas manualmente.
- WhatsApp e telefone são guardados só com dígitos e DDI (`5511988887777`).

## 14. Como a busca funciona

- Cada fornecedor tem um `search_document` com nome, nome fantasia, vendedor, cidade, produtos,
  marcas e categorias, **sem acentos e em minúsculas**. Triggers mantêm o documento atualizado
  quando o fornecedor, seus vínculos ou o nome de uma categoria/produto/marca mudam.
- Um índice **GIN trigram** (`pg_trgm`) deixa rápido o `ILIKE '%termo%'`.
- O texto digitado é normalizado da mesma forma; cada palavra precisa aparecer no documento
  (`película samsung` → fornecedores que têm as duas).
- **Uma única requisição** por busca (dados + produtos + marcas + categorias), com
  **debounce de 300 ms** e descarte de respostas antigas.
- Favoritos aparecem primeiro por padrão; o estado da busca fica na URL (voltar dos detalhes
  mantém a pesquisa).

## 15. Personalizar nome e ícone

- **Nome, descrição e cores:** `lib/app-config.ts`.
- **Ícones:** edite `public/icons/icon.svg` (cantos arredondados) e
  `public/icons/icon-maskable.svg` (fundo inteiro, usado pelo Android), copie o primeiro para
  `app/icon.svg` (favicon) e gere os PNGs:

  ```bash
  CHROME_PATH="/caminho/do/chrome" npm run generate:icons
  ```

  Ou gere `icon-192.png`, `icon-512.png`, `icon-maskable-512.png` (em `public/icons/`) e
  `app/apple-icon.png` (180×180) em qualquer gerador de ícones, mantendo os nomes.

## 16. Limitações da versão 1 e próximos passos

Limitações conhecidas:

- Um contato por fornecedor (o tipo `Contact` já existe para a futura tabela `contacts`).
- A busca retorna no máximo 300 fornecedores por vez (suficiente para um catálogo pessoal;
  basta refinar a busca).
- Sem modo offline para os dados (por segurança, nada privado é guardado em cache).
- Não há tela de "esqueci minha senha" nem de cadastro: usuários são criados no painel do
  Supabase.
- A pesquisa encontra trechos de palavras (`carrega` → Carregadores), mas não corrige erros de
  digitação (`pelicla`).

Preparado para evoluir (não implementado): vários contatos, tabela de preços, histórico de
compras, pedidos, catálogo em PDF (Supabase Storage), importação por Excel, avaliação e
ranking, prazo de entrega, pedido mínimo, condições de pagamento e integração com o Point Tech.
Cada item vira uma nova tabela ligada a `suppliers (id, user_id)` com o mesmo padrão de RLS.
