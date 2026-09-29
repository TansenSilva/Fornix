-- =============================================================================
-- Listas de importação (cotadas em dólar)
--
-- Em listas com currency = 'USD', cada item guarda o preço em dólar e a % de
-- taxa (quem traz o produto). O preço em reais é calculado pelo banco:
--   unit_price (R$) = unit_price_usd × exchange_rate × (1 + fee_percent / 100)
-- e recalculado para todos os itens quando a cotação muda.
-- =============================================================================

alter table public.purchase_lists
  add column if not exists currency text not null default 'BRL' check (currency in ('BRL', 'USD')),
  add column if not exists exchange_rate numeric(12, 4) check (exchange_rate is null or exchange_rate > 0),
  add column if not exists exchange_rate_updated_at timestamptz,
  add column if not exists default_fee_percent numeric(6, 2) not null default 0
    check (default_fee_percent between 0 and 1000);

alter table public.purchase_list_items
  add column if not exists unit_price_usd numeric(12, 2) check (unit_price_usd is null or unit_price_usd >= 0),
  add column if not exists fee_percent numeric(6, 2) not null default 0 check (fee_percent between 0 and 1000);

-- Calcula o preço em reais do item a partir do dólar (somente em listas USD)
create or replace function public.compute_import_item_price()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_currency text;
  v_rate numeric;
begin
  select l.currency, l.exchange_rate into v_currency, v_rate
    from public.purchase_lists l
   where l.id = new.list_id;

  if v_currency = 'USD' and new.unit_price_usd is not null and v_rate is not null then
    new.unit_price := round(new.unit_price_usd * v_rate * (1 + new.fee_percent / 100), 2);
  end if;
  return new;
end;
$$;

create trigger purchase_list_items_import_price
  before insert or update on public.purchase_list_items
  for each row execute function public.compute_import_item_price();

-- Mudou a cotação ou a moeda da lista: recalcula os itens
create or replace function public.recompute_import_list()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.currency = 'USD'
     and (new.exchange_rate is distinct from old.exchange_rate or new.currency is distinct from old.currency) then
    update public.purchase_list_items
       set unit_price_usd = unit_price_usd
     where list_id = new.id
       and unit_price_usd is not null;
  end if;
  return null;
end;
$$;

create trigger purchase_lists_recompute_import
  after update of exchange_rate, currency on public.purchase_lists
  for each row execute function public.recompute_import_list();

-- Resumo passa a trazer moeda e total em dólar (colunas novas no final)
create or replace view public.purchase_list_summaries
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
  coalesce(sum(i.line_total), 0)::numeric as total,
  l.currency,
  coalesce(sum(round(i.quantity * i.unit_price_usd, 2)), 0)::numeric as total_usd
from public.purchase_lists l
left join public.suppliers s on s.id = l.supplier_id
left join public.purchase_list_items i on i.list_id = l.id
group by l.id, s.name;

grant select on public.purchase_list_summaries to authenticated;
