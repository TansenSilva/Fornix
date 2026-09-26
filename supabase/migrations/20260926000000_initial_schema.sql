-- =============================================================================
-- Meus Fornecedores — esquema inicial
--
-- Tabelas: profiles, categories, products, brands, suppliers,
--          supplier_products, supplier_brands, supplier_categories
--
-- Todas as tabelas com dados possuem user_id e RLS: cada usuário só enxerga
-- e altera os próprios registros. Usuários anônimos não têm acesso a nada.
-- =============================================================================

create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- -----------------------------------------------------------------------------
-- Funções utilitárias de normalização
-- -----------------------------------------------------------------------------

-- Remove acentos, converte para minúsculas e colapsa espaços.
-- "  Película  3D " -> "pelicula 3d"
create or replace function public.normalize_text(value text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select regexp_replace(
    lower(extensions.unaccent('extensions.unaccent'::regdictionary, trim(coalesce(value, '')))),
    '\s+', ' ', 'g'
  );
$$;

-- "https://www.Site.com.br/" -> "site.com.br"
create or replace function public.normalize_url(value text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select regexp_replace(
    regexp_replace(lower(trim(coalesce(value, ''))), '^(https?://)?(www\.)?', ''),
    '/+$', ''
  );
$$;

-- -----------------------------------------------------------------------------
-- profiles
-- -----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- categories (configuráveis por usuário)
-- -----------------------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 60),
  name_normalized text generated always as (public.normalize_text(name)) stored,
  created_at timestamptz not null default now(),
  unique (user_id, name_normalized),
  unique (id, user_id)
);

-- -----------------------------------------------------------------------------
-- products (catálogo de produtos do usuário, reaproveitado entre fornecedores)
-- -----------------------------------------------------------------------------
create table public.products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  name_normalized text generated always as (public.normalize_text(name)) stored,
  created_at timestamptz not null default now(),
  unique (user_id, name_normalized),
  unique (id, user_id)
);

-- -----------------------------------------------------------------------------
-- brands
-- -----------------------------------------------------------------------------
create table public.brands (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  name_normalized text generated always as (public.normalize_text(name)) stored,
  created_at timestamptz not null default now(),
  unique (user_id, name_normalized),
  unique (id, user_id)
);

-- -----------------------------------------------------------------------------
-- suppliers
-- -----------------------------------------------------------------------------
create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,

  name text not null check (char_length(trim(name)) between 1 and 120),
  trade_name text,
  contact_name text,

  whatsapp text check (whatsapp is null or whatsapp ~ '^[0-9]{8,15}$'), -- somente dígitos, com DDI
  phone text check (phone is null or phone ~ '^[0-9]{8,15}$'),
  email text,
  website text,
  instagram text,
  city text,
  state text check (state is null or state ~ '^[A-Z]{2}$'),
  notes text,

  portal_url text,
  portal_login text,
  -- Senha do portal criptografada pela aplicação (AES-256-GCM). Nunca texto puro.
  portal_password_encrypted text,
  has_portal_password boolean generated always as (portal_password_encrypted is not null) stored,

  is_favorite boolean not null default false,

  name_normalized text generated always as (public.normalize_text(name)) stored,
  -- Documento de busca desnormalizado (nome, vendedor, cidade, produtos, marcas,
  -- categorias), sem acentos e em minúsculas. Mantido por triggers.
  search_document text not null default '',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (id, user_id)
);

-- -----------------------------------------------------------------------------
-- Tabelas de relacionamento (N:N). As FKs compostas (id, user_id) garantem que
-- um fornecedor só possa ser ligado a produtos/marcas/categorias do mesmo dono.
-- -----------------------------------------------------------------------------
create table public.supplier_products (
  supplier_id uuid not null,
  product_id uuid not null,
  user_id uuid not null default auth.uid(),
  primary key (supplier_id, product_id),
  foreign key (supplier_id, user_id) references public.suppliers (id, user_id) on delete cascade,
  foreign key (product_id, user_id) references public.products (id, user_id) on delete cascade
);

create table public.supplier_brands (
  supplier_id uuid not null,
  brand_id uuid not null,
  user_id uuid not null default auth.uid(),
  primary key (supplier_id, brand_id),
  foreign key (supplier_id, user_id) references public.suppliers (id, user_id) on delete cascade,
  foreign key (brand_id, user_id) references public.brands (id, user_id) on delete cascade
);

create table public.supplier_categories (
  supplier_id uuid not null,
  category_id uuid not null,
  user_id uuid not null default auth.uid(),
  primary key (supplier_id, category_id),
  foreign key (supplier_id, user_id) references public.suppliers (id, user_id) on delete cascade,
  foreign key (category_id, user_id) references public.categories (id, user_id) on delete cascade
);

-- -----------------------------------------------------------------------------
-- Índices
-- -----------------------------------------------------------------------------
create index suppliers_search_document_trgm_idx
  on public.suppliers using gin (search_document extensions.gin_trgm_ops);
create index suppliers_name_normalized_trgm_idx
  on public.suppliers using gin (name_normalized extensions.gin_trgm_ops);
create index suppliers_user_favorite_name_idx
  on public.suppliers (user_id, is_favorite desc, name_normalized);
create index suppliers_user_created_idx on public.suppliers (user_id, created_at desc);
create index suppliers_user_state_idx on public.suppliers (user_id, state);
create index suppliers_user_whatsapp_idx on public.suppliers (user_id, whatsapp);

create index products_name_trgm_idx on public.products using gin (name_normalized extensions.gin_trgm_ops);
create index brands_name_trgm_idx on public.brands using gin (name_normalized extensions.gin_trgm_ops);

create index supplier_products_product_idx on public.supplier_products (product_id);
create index supplier_products_user_idx on public.supplier_products (user_id);
create index supplier_brands_brand_idx on public.supplier_brands (brand_id);
create index supplier_brands_user_idx on public.supplier_brands (user_id);
create index supplier_categories_category_idx on public.supplier_categories (category_id);
create index supplier_categories_user_idx on public.supplier_categories (user_id);

-- -----------------------------------------------------------------------------
-- Documento de busca
-- -----------------------------------------------------------------------------
create or replace function public.suppliers_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    new.updated_at := now();
  end if;

  new.search_document := public.normalize_text(concat_ws(' ',
    new.name,
    new.trade_name,
    new.contact_name,
    new.city,
    (select string_agg(p.name, ' ')
       from public.supplier_products sp
       join public.products p on p.id = sp.product_id
      where sp.supplier_id = new.id),
    (select string_agg(b.name, ' ')
       from public.supplier_brands sb
       join public.brands b on b.id = sb.brand_id
      where sb.supplier_id = new.id),
    (select string_agg(c.name, ' ')
       from public.supplier_categories sc
       join public.categories c on c.id = sc.category_id
      where sc.supplier_id = new.id)
  ));

  return new;
end;
$$;

create trigger suppliers_before_write
  before insert or update on public.suppliers
  for each row execute function public.suppliers_before_write();

-- Quando um vínculo muda, "toca" o fornecedor para recalcular o documento.
create or replace function public.refresh_supplier_from_link()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  update public.suppliers
     set search_document = search_document
   where id = coalesce(new.supplier_id, old.supplier_id);
  return null;
end;
$$;

create trigger supplier_products_refresh
  after insert or delete on public.supplier_products
  for each row execute function public.refresh_supplier_from_link();
create trigger supplier_brands_refresh
  after insert or delete on public.supplier_brands
  for each row execute function public.refresh_supplier_from_link();
create trigger supplier_categories_refresh
  after insert or delete on public.supplier_categories
  for each row execute function public.refresh_supplier_from_link();

-- Quando o nome de uma categoria/produto/marca muda, recalcula os fornecedores ligados.
create or replace function public.refresh_suppliers_from_tag()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.name is distinct from old.name then
    if tg_table_name = 'categories' then
      update public.suppliers s set search_document = s.search_document
       where s.id in (select supplier_id from public.supplier_categories where category_id = new.id);
    elsif tg_table_name = 'products' then
      update public.suppliers s set search_document = s.search_document
       where s.id in (select supplier_id from public.supplier_products where product_id = new.id);
    elsif tg_table_name = 'brands' then
      update public.suppliers s set search_document = s.search_document
       where s.id in (select supplier_id from public.supplier_brands where brand_id = new.id);
    end if;
  end if;
  return null;
end;
$$;

create trigger categories_refresh_suppliers
  after update of name on public.categories
  for each row execute function public.refresh_suppliers_from_tag();
create trigger products_refresh_suppliers
  after update of name on public.products
  for each row execute function public.refresh_suppliers_from_tag();
create trigger brands_refresh_suppliers
  after update of name on public.brands
  for each row execute function public.refresh_suppliers_from_tag();

-- -----------------------------------------------------------------------------
-- Novo usuário: cria profile + categorias padrão (editáveis depois)
-- -----------------------------------------------------------------------------
create or replace function public.seed_default_categories(p_user_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.categories (user_id, name)
  select p_user_id, c.name
    from unnest(array[
      'Celulares', 'Capas', 'Películas', 'Carregadores', 'Cabos', 'Áudio',
      'Peças', 'Ferramentas', 'Acessórios', 'Informática', 'Outros'
    ]) as c(name)
  on conflict (user_id, name_normalized) do nothing;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;

  perform public.seed_default_categories(new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Usuários que já existiam antes desta migration
insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;

select public.seed_default_categories(id) from auth.users;

-- -----------------------------------------------------------------------------
-- RPC: salvar fornecedor (dados + produtos + marcas + categorias) em uma
-- única transação. A senha chega JÁ CRIPTOGRAFADA pela aplicação.
-- p_password_action: 'keep' (mantém), 'set' (define), 'clear' (remove)
-- -----------------------------------------------------------------------------
create or replace function public.save_supplier(
  p_supplier_id uuid,
  p_data jsonb,
  p_products text[],
  p_brands text[],
  p_category_ids uuid[],
  p_password_action text default 'keep',
  p_password_encrypted text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_id uuid;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  if p_password_action not in ('keep', 'set', 'clear') then
    raise exception 'invalid password action';
  end if;

  if p_supplier_id is null then
    insert into public.suppliers (
      user_id, name, trade_name, contact_name, whatsapp, phone, email, website,
      instagram, city, state, notes, portal_url, portal_login,
      portal_password_encrypted, is_favorite
    )
    values (
      v_user,
      trim(p_data ->> 'name'),
      nullif(trim(p_data ->> 'trade_name'), ''),
      nullif(trim(p_data ->> 'contact_name'), ''),
      nullif(trim(p_data ->> 'whatsapp'), ''),
      nullif(trim(p_data ->> 'phone'), ''),
      nullif(trim(p_data ->> 'email'), ''),
      nullif(trim(p_data ->> 'website'), ''),
      nullif(trim(p_data ->> 'instagram'), ''),
      nullif(trim(p_data ->> 'city'), ''),
      nullif(trim(p_data ->> 'state'), ''),
      nullif(trim(p_data ->> 'notes'), ''),
      nullif(trim(p_data ->> 'portal_url'), ''),
      nullif(trim(p_data ->> 'portal_login'), ''),
      case when p_password_action = 'set' then p_password_encrypted end,
      coalesce((p_data ->> 'is_favorite')::boolean, false)
    )
    returning id into v_id;
  else
    update public.suppliers set
      name = trim(p_data ->> 'name'),
      trade_name = nullif(trim(p_data ->> 'trade_name'), ''),
      contact_name = nullif(trim(p_data ->> 'contact_name'), ''),
      whatsapp = nullif(trim(p_data ->> 'whatsapp'), ''),
      phone = nullif(trim(p_data ->> 'phone'), ''),
      email = nullif(trim(p_data ->> 'email'), ''),
      website = nullif(trim(p_data ->> 'website'), ''),
      instagram = nullif(trim(p_data ->> 'instagram'), ''),
      city = nullif(trim(p_data ->> 'city'), ''),
      state = nullif(trim(p_data ->> 'state'), ''),
      notes = nullif(trim(p_data ->> 'notes'), ''),
      portal_url = nullif(trim(p_data ->> 'portal_url'), ''),
      portal_login = nullif(trim(p_data ->> 'portal_login'), ''),
      portal_password_encrypted = case p_password_action
        when 'set' then p_password_encrypted
        when 'clear' then null
        else portal_password_encrypted
      end
    where id = p_supplier_id and user_id = v_user
    returning id into v_id;

    if v_id is null then
      raise exception 'supplier not found' using errcode = 'P0002';
    end if;
  end if;

  -- Produtos: cria os que ainda não existem (sem duplicar por acento/caixa)
  insert into public.products (user_id, name)
  select distinct on (public.normalize_text(n)) v_user, regexp_replace(trim(n), '\s+', ' ', 'g')
    from unnest(coalesce(p_products, '{}')) as n
   where trim(n) <> ''
  on conflict (user_id, name_normalized) do nothing;

  delete from public.supplier_products sp
   where sp.supplier_id = v_id
     and sp.product_id not in (
       select p.id from public.products p
        where p.user_id = v_user
          and p.name_normalized in (select public.normalize_text(n) from unnest(coalesce(p_products, '{}')) as n)
     );

  insert into public.supplier_products (supplier_id, product_id, user_id)
  select v_id, p.id, v_user
    from public.products p
   where p.user_id = v_user
     and p.name_normalized in (select public.normalize_text(n) from unnest(coalesce(p_products, '{}')) as n)
  on conflict do nothing;

  -- Marcas
  insert into public.brands (user_id, name)
  select distinct on (public.normalize_text(n)) v_user, regexp_replace(trim(n), '\s+', ' ', 'g')
    from unnest(coalesce(p_brands, '{}')) as n
   where trim(n) <> ''
  on conflict (user_id, name_normalized) do nothing;

  delete from public.supplier_brands sb
   where sb.supplier_id = v_id
     and sb.brand_id not in (
       select b.id from public.brands b
        where b.user_id = v_user
          and b.name_normalized in (select public.normalize_text(n) from unnest(coalesce(p_brands, '{}')) as n)
     );

  insert into public.supplier_brands (supplier_id, brand_id, user_id)
  select v_id, b.id, v_user
    from public.brands b
   where b.user_id = v_user
     and b.name_normalized in (select public.normalize_text(n) from unnest(coalesce(p_brands, '{}')) as n)
  on conflict do nothing;

  -- Categorias
  delete from public.supplier_categories sc
   where sc.supplier_id = v_id
     and not (sc.category_id = any (coalesce(p_category_ids, '{}')));

  insert into public.supplier_categories (supplier_id, category_id, user_id)
  select v_id, c.id, v_user
    from public.categories c
   where c.user_id = v_user
     and c.id = any (coalesce(p_category_ids, '{}'))
  on conflict do nothing;

  perform public.cleanup_orphan_tags();

  return v_id;
end;
$$;

-- Remove produtos/marcas que não estão ligados a nenhum fornecedor, para que o
-- autocomplete não sugira itens digitados errado e depois removidos.
create or replace function public.cleanup_orphan_tags()
returns void
language sql
security invoker
set search_path = ''
as $$
  delete from public.products p
   where p.user_id = auth.uid()
     and not exists (select 1 from public.supplier_products sp where sp.product_id = p.id);
  delete from public.brands b
   where b.user_id = auth.uid()
     and not exists (select 1 from public.supplier_brands sb where sb.brand_id = b.id);
$$;

-- -----------------------------------------------------------------------------
-- RPC: possíveis duplicidades (nome parecido, mesmo WhatsApp, e-mail ou site)
-- -----------------------------------------------------------------------------
create or replace function public.find_similar_suppliers(
  p_name text default null,
  p_whatsapp text default null,
  p_email text default null,
  p_website text default null,
  p_exclude_id uuid default null
)
returns table (id uuid, name text, reasons text[])
language sql
stable
security invoker
set search_path = ''
as $$
  select m.id, m.name,
         array_remove(array[
           case when m.name_match then 'nome' end,
           case when m.whatsapp_match then 'WhatsApp' end,
           case when m.email_match then 'e-mail' end,
           case when m.website_match then 'site' end
         ], null) as reasons
    from (
      select s.id, s.name,
             (public.normalize_text(p_name) <> ''
               and (s.name_normalized = public.normalize_text(p_name)
                    or extensions.similarity(s.name_normalized, public.normalize_text(p_name)) >= 0.6)) as name_match,
             (coalesce(p_whatsapp, '') <> '' and s.whatsapp = p_whatsapp) as whatsapp_match,
             (coalesce(trim(p_email), '') <> '' and lower(s.email) = lower(trim(p_email))) as email_match,
             (public.normalize_url(p_website) <> '' and public.normalize_url(s.website) = public.normalize_url(p_website)) as website_match
        from public.suppliers s
       where s.user_id = auth.uid()
         and (p_exclude_id is null or s.id <> p_exclude_id)
    ) m
   where m.name_match or m.whatsapp_match or m.email_match or m.website_match
   limit 5;
$$;

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.brands enable row level security;
alter table public.suppliers enable row level security;
alter table public.supplier_products enable row level security;
alter table public.supplier_brands enable row level security;
alter table public.supplier_categories enable row level security;

create policy "profiles: select own" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "profiles: update own" on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

do $$
declare
  t text;
begin
  foreach t in array array[
    'categories', 'products', 'brands', 'suppliers',
    'supplier_products', 'supplier_brands', 'supplier_categories'
  ] loop
    execute format(
      'create policy "%1$s: select own" on public.%1$I for select to authenticated using ((select auth.uid()) = user_id)', t);
    execute format(
      'create policy "%1$s: insert own" on public.%1$I for insert to authenticated with check ((select auth.uid()) = user_id)', t);
    execute format(
      'create policy "%1$s: update own" on public.%1$I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
    execute format(
      'create policy "%1$s: delete own" on public.%1$I for delete to authenticated using ((select auth.uid()) = user_id)', t);
  end loop;
end;
$$;

-- Defesa extra: o papel anônimo não tem nenhum privilégio nas tabelas/funções.
revoke all on all tables in schema public from anon;
revoke execute on function public.save_supplier(uuid, jsonb, text[], text[], uuid[], text, text) from public, anon;
revoke execute on function public.find_similar_suppliers(text, text, text, text, uuid) from public, anon;
revoke execute on function public.cleanup_orphan_tags() from public, anon;
revoke execute on function public.seed_default_categories(uuid) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

grant execute on function public.save_supplier(uuid, jsonb, text[], text[], uuid[], text, text) to authenticated;
grant execute on function public.find_similar_suppliers(text, text, text, text, uuid) to authenticated;
grant execute on function public.cleanup_orphan_tags() to authenticated;
