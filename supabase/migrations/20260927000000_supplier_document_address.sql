-- =============================================================================
-- CNPJ/CPF e endereço completo do fornecedor
-- =============================================================================

alter table public.suppliers
  -- Somente dígitos (CPF: 11) ou CNPJ com 14 posições (aceita o CNPJ alfanumérico:
  -- 12 caracteres [0-9A-Z] + 2 dígitos verificadores).
  add column if not exists document text
    check (document is null or document ~ '^([0-9]{11}|[0-9A-Z]{12}[0-9]{2})$'),
  add column if not exists cep text check (cep is null or cep ~ '^[0-9]{8}$'),
  add column if not exists street text,
  add column if not exists address_number text,
  add column if not exists complement text,
  add column if not exists neighborhood text;

create index if not exists suppliers_user_document_idx on public.suppliers (user_id, document);

-- -----------------------------------------------------------------------------
-- save_supplier: passa a gravar documento e endereço (mesma assinatura)
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
      user_id, name, trade_name, document, contact_name, whatsapp, phone, email, website,
      instagram, cep, street, address_number, complement, neighborhood, city, state, notes,
      portal_url, portal_login, portal_password_encrypted, is_favorite
    )
    values (
      v_user,
      trim(p_data ->> 'name'),
      nullif(trim(p_data ->> 'trade_name'), ''),
      nullif(trim(p_data ->> 'document'), ''),
      nullif(trim(p_data ->> 'contact_name'), ''),
      nullif(trim(p_data ->> 'whatsapp'), ''),
      nullif(trim(p_data ->> 'phone'), ''),
      nullif(trim(p_data ->> 'email'), ''),
      nullif(trim(p_data ->> 'website'), ''),
      nullif(trim(p_data ->> 'instagram'), ''),
      nullif(trim(p_data ->> 'cep'), ''),
      nullif(trim(p_data ->> 'street'), ''),
      nullif(trim(p_data ->> 'address_number'), ''),
      nullif(trim(p_data ->> 'complement'), ''),
      nullif(trim(p_data ->> 'neighborhood'), ''),
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
      document = nullif(trim(p_data ->> 'document'), ''),
      contact_name = nullif(trim(p_data ->> 'contact_name'), ''),
      whatsapp = nullif(trim(p_data ->> 'whatsapp'), ''),
      phone = nullif(trim(p_data ->> 'phone'), ''),
      email = nullif(trim(p_data ->> 'email'), ''),
      website = nullif(trim(p_data ->> 'website'), ''),
      instagram = nullif(trim(p_data ->> 'instagram'), ''),
      cep = nullif(trim(p_data ->> 'cep'), ''),
      street = nullif(trim(p_data ->> 'street'), ''),
      address_number = nullif(trim(p_data ->> 'address_number'), ''),
      complement = nullif(trim(p_data ->> 'complement'), ''),
      neighborhood = nullif(trim(p_data ->> 'neighborhood'), ''),
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

-- -----------------------------------------------------------------------------
-- find_similar_suppliers: também avisa quando o CNPJ/CPF já está cadastrado
-- -----------------------------------------------------------------------------
drop function if exists public.find_similar_suppliers(text, text, text, text, uuid);

create or replace function public.find_similar_suppliers(
  p_name text default null,
  p_whatsapp text default null,
  p_email text default null,
  p_website text default null,
  p_exclude_id uuid default null,
  p_document text default null
)
returns table (id uuid, name text, reasons text[])
language sql
stable
security invoker
set search_path = ''
as $$
  select m.id, m.name,
         array_remove(array[
           case when m.document_match then 'CNPJ/CPF' end,
           case when m.name_match then 'nome' end,
           case when m.whatsapp_match then 'WhatsApp' end,
           case when m.email_match then 'e-mail' end,
           case when m.website_match then 'site' end
         ], null) as reasons
    from (
      select s.id, s.name,
             (coalesce(p_document, '') <> '' and s.document = p_document) as document_match,
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
   where m.document_match or m.name_match or m.whatsapp_match or m.email_match or m.website_match
   limit 5;
$$;

revoke execute on function public.find_similar_suppliers(text, text, text, text, uuid, text) from public, anon;
grant execute on function public.find_similar_suppliers(text, text, text, text, uuid, text) to authenticated;
