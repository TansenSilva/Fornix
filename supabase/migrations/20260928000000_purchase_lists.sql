-- =============================================================================
-- Listas de compras / pedidos
-- =============================================================================

create table public.purchase_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 120),
  supplier_id uuid,
  status text not null default 'draft' check (status in ('draft', 'ordered', 'received', 'canceled')),
  order_date date not null default current_date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  -- Se o fornecedor for excluído, a lista continua existindo (sem fornecedor).
  foreign key (supplier_id, user_id) references public.suppliers (id, user_id) on delete set null (supplier_id)
);

create table public.purchase_list_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null,
  user_id uuid not null default auth.uid(),
  product_name text not null check (char_length(trim(product_name)) between 1 and 120),
  quantity numeric(12, 3) not null default 1 check (quantity > 0),
  unit_price numeric(12, 2) not null default 0 check (unit_price >= 0),
  line_total numeric(14, 2) generated always as (round(quantity * unit_price, 2)) stored,
  checked boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  foreign key (list_id, user_id) references public.purchase_lists (id, user_id) on delete cascade
);

create index purchase_lists_user_date_idx on public.purchase_lists (user_id, order_date desc, created_at desc);
create index purchase_lists_supplier_idx on public.purchase_lists (supplier_id);
create index purchase_list_items_list_idx on public.purchase_list_items (list_id, position);
create index purchase_list_items_user_idx on public.purchase_list_items (user_id);

-- updated_at da lista muda quando ela ou seus itens mudam
create or replace function public.touch_purchase_list()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_table_name = 'purchase_lists' then
    new.updated_at := now();
    return new;
  end if;
  update public.purchase_lists
     set updated_at = now()
   where id = coalesce(new.list_id, old.list_id);
  return null;
end;
$$;

create trigger purchase_lists_touch
  before update on public.purchase_lists
  for each row execute function public.touch_purchase_list();
create trigger purchase_list_items_touch
  after insert or update or delete on public.purchase_list_items
  for each row execute function public.touch_purchase_list();

-- Resumo para a listagem (total, nº de itens). security_invoker = respeita o RLS.
create view public.purchase_list_summaries
with (security_invoker = true) as
select
  l.id,
  l.user_id,
  l.title,
  l.supplier_id,
  s.name as supplier_name,
  l.status,
  l.order_date,
  l.created_at,
  l.updated_at,
  count(i.id)::integer as item_count,
  coalesce(sum(i.quantity), 0)::numeric as total_quantity,
  coalesce(sum(i.line_total), 0)::numeric as total
from public.purchase_lists l
left join public.suppliers s on s.id = l.supplier_id
left join public.purchase_list_items i on i.list_id = l.id
group by l.id, s.name;

-- RLS
alter table public.purchase_lists enable row level security;
alter table public.purchase_list_items enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['purchase_lists', 'purchase_list_items'] loop
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

revoke all on public.purchase_lists, public.purchase_list_items, public.purchase_list_summaries from anon;
grant select, insert, update, delete on public.purchase_lists, public.purchase_list_items to authenticated;
grant select on public.purchase_list_summaries to authenticated;
