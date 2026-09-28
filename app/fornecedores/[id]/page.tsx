import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import Link from "next/link";
import { AtSign, ClipboardList, ExternalLink, Globe, Mail, MapPin, MessageCircle, Phone, Plus, Store } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { CopyButton } from "@/components/suppliers/CopyButton";
import { CredentialField } from "@/components/suppliers/CredentialField";
import { SupplierDetailActions } from "@/components/suppliers/SupplierDetailActions";
import { Tag } from "@/components/ui/Tag";
import { buttonClasses } from "@/components/ui/button";
import { PurchaseStatusBadge } from "@/components/purchases/PurchaseStatusBadge";
import { getPurchaseListSummaries } from "@/lib/data/purchase-lists";
import { getSupplier } from "@/lib/data/suppliers";
import { createClient } from "@/lib/supabase/server";
import { documentType, formatDocument } from "@/utils/document";
import { maskCep } from "@/utils/masks";
import { formatDateBr } from "@/utils/date";
import { formatMoney } from "@/utils/money";
import { formatPhone, telLink, whatsappLink } from "@/utils/phone";
import { displayUrl, instagramLink, safeHref } from "@/utils/url";

export const metadata: Metadata = { title: "Fornecedor" };

function Card({ title, children, className = "" }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={`min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${className}`}>
      <h2 className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, children, action }: { label: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex min-h-11 items-center gap-2 border-b border-slate-100 py-1 last:border-0">
      <dt className="w-24 shrink-0 text-sm text-slate-500">{label}</dt>
      <dd className="min-w-0 flex-1 truncate text-sm text-slate-900">{children}</dd>
      {action}
    </div>
  );
}

function TagList({ items, empty }: { items: { id: string; name: string }[]; empty: string }) {
  if (items.length === 0) return <p className="text-sm text-slate-400">{empty}</p>;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <li key={item.id} className="max-w-full">
          <Tag>{item.name}</Tag>
        </li>
      ))}
    </ul>
  );
}

export default async function SupplierPage({ params }: PageProps<"/fornecedores/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const [supplier, orders] = await Promise.all([
    getSupplier(supabase, id),
    getPurchaseListSummaries(supabase, { supplierId: id, limit: 5 }).catch(() => []),
  ]);
  if (!supplier) notFound();

  const website = safeHref(supplier.website);
  const portal = safeHref(supplier.portalUrl);
  const location = [supplier.city, supplier.state].filter(Boolean).join(" / ");
  const streetLine = [
    [supplier.street, supplier.addressNumber].filter(Boolean).join(", "),
    supplier.complement,
  ]
    .filter(Boolean)
    .join(" - ");
  const cityLine = [supplier.neighborhood, [supplier.city, supplier.state].filter(Boolean).join("/")]
    .filter(Boolean)
    .join(" - ");
  const cepLine = supplier.cep ? `CEP ${maskCep(supplier.cep)}` : "";
  const fullAddress = [streetLine, cityLine, cepLine].filter(Boolean).join(", ");
  const hasAddress = Boolean(supplier.street || supplier.cep || supplier.neighborhood);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`;
  const hasPortal = Boolean(portal || supplier.portalLogin || supplier.hasPortalPassword);

  return (
    <>
      <AppHeader
        title={supplier.name}
        backHref="/"
        actions={
          <SupplierDetailActions supplierId={supplier.id} supplierName={supplier.name} isFavorite={supplier.isFavorite} />
        }
      />
      <PageContainer>
        {supplier.tradeName && <p className="-mt-1 mb-3 text-sm text-slate-500">{supplier.tradeName}</p>}

        {/* Ações rápidas */}
        <div className="mb-4 flex flex-wrap gap-2">
          {supplier.whatsapp && (
            <a
              href={whatsappLink(supplier.whatsapp)}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClasses("whatsapp", "md", "flex-1 sm:flex-none")}
            >
              <MessageCircle className="size-5" aria-hidden />
              WhatsApp
            </a>
          )}
          {(supplier.phone || supplier.whatsapp) && (
            <a href={telLink((supplier.phone ?? supplier.whatsapp) as string)} className={buttonClasses("secondary", "md", "flex-1 sm:flex-none")}>
              <Phone className="size-4" aria-hidden />
              Ligar
            </a>
          )}
          {supplier.email && (
            <a href={`mailto:${supplier.email}`} className={buttonClasses("secondary", "md", "flex-1 sm:flex-none")}>
              <Mail className="size-4" aria-hidden />
              E-mail
            </a>
          )}
          {website && (
            <a href={website} target="_blank" rel="noopener noreferrer" className={buttonClasses("secondary", "md", "flex-1 sm:flex-none")}>
              <Globe className="size-4" aria-hidden />
              Abrir site
            </a>
          )}
          {portal && (
            <a href={portal} target="_blank" rel="noopener noreferrer" className={buttonClasses("secondary", "md", "flex-1 sm:flex-none")}>
              <Store className="size-4" aria-hidden />
              Portal do fornecedor
            </a>
          )}
        </div>

        <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
          <Card title="Contato" className="lg:row-span-2">
            <dl>
              <Row label="Fornecedor">{supplier.name}</Row>
              {supplier.document && (
                <Row
                  label={documentType(supplier.document) ?? "CNPJ/CPF"}
                  action={<CopyButton value={formatDocument(supplier.document)} label="Copiar CNPJ/CPF" />}
                >
                  <span className="tabular-nums">{formatDocument(supplier.document)}</span>
                </Row>
              )}
              {supplier.contactName && <Row label="Vendedor">{supplier.contactName}</Row>}
              {supplier.whatsapp && (
                <Row label="WhatsApp" action={<CopyButton value={formatPhone(supplier.whatsapp)} label="Copiar WhatsApp" />}>
                  <a href={whatsappLink(supplier.whatsapp)} target="_blank" rel="noopener noreferrer" className="text-brand-700 hover:underline">
                    {formatPhone(supplier.whatsapp)}
                  </a>
                </Row>
              )}
              {supplier.phone && (
                <Row label="Telefone" action={<CopyButton value={formatPhone(supplier.phone)} label="Copiar telefone" />}>
                  <a href={telLink(supplier.phone)} className="text-brand-700 hover:underline">
                    {formatPhone(supplier.phone)}
                  </a>
                </Row>
              )}
              {supplier.email && (
                <Row label="E-mail" action={<CopyButton value={supplier.email} label="Copiar e-mail" />}>
                  <a href={`mailto:${supplier.email}`} className="text-brand-700 hover:underline">
                    {supplier.email}
                  </a>
                </Row>
              )}
              {supplier.instagram && (
                <Row label="Instagram">
                  <a
                    href={instagramLink(supplier.instagram)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-brand-700 hover:underline"
                  >
                    <AtSign className="size-3.5" aria-hidden />@{supplier.instagram}
                  </a>
                </Row>
              )}
              {website && (
                <Row label="Site">
                  <a href={website} target="_blank" rel="noopener noreferrer" className="text-brand-700 hover:underline">
                    {displayUrl(website)}
                  </a>
                </Row>
              )}
              {location && !hasAddress && <Row label="Cidade/UF">{location}</Row>}
            </dl>
          </Card>

          {hasAddress && (
            <Card title="Endereço">
              <div className="flex items-start gap-2">
                <address className="min-w-0 flex-1 text-sm leading-6 not-italic text-slate-800">
                  {streetLine && <span className="block">{streetLine}</span>}
                  {cityLine && <span className="block">{cityLine}</span>}
                  {cepLine && <span className="block text-slate-500">{cepLine}</span>}
                </address>
                <CopyButton value={fullAddress} label="Copiar endereço" />
              </div>
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClasses("secondary", "md", "mt-3 w-full")}
              >
                <MapPin className="size-4" aria-hidden />
                Abrir no mapa
              </a>
            </Card>
          )}

          <Card title="Produtos">
            <TagList items={supplier.products} empty="Nenhum produto cadastrado." />
          </Card>

          <Card title="Marcas">
            <TagList items={supplier.brands} empty="Nenhuma marca cadastrada." />
          </Card>

          <Card title="Categorias">
            <TagList items={supplier.categories} empty="Sem categoria." />
          </Card>

          {hasPortal && (
            <Card title="Portal de compras">
              <dl>
                {portal && (
                  <Row label="URL">
                    <a href={portal} target="_blank" rel="noopener noreferrer" className="text-brand-700 hover:underline">
                      {displayUrl(portal)}
                    </a>
                  </Row>
                )}
                {supplier.portalLogin && (
                  <Row label="Login" action={<CopyButton value={supplier.portalLogin} label="Copiar login" />}>
                    {supplier.portalLogin}
                  </Row>
                )}
                {supplier.hasPortalPassword && (
                  <div className="flex min-h-11 flex-wrap items-center gap-2 py-1">
                    <dt className="w-24 shrink-0 text-sm text-slate-500">Senha</dt>
                    <dd className="min-w-0 basis-full sm:basis-0 sm:flex-1">
                      <CredentialField supplierId={supplier.id} />
                    </dd>
                  </div>
                )}
              </dl>
              {portal && (
                <a
                  href={portal}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonClasses("secondary", "md", "mt-3 w-full")}
                >
                  <ExternalLink className="size-4" aria-hidden />
                  Abrir portal
                </a>
              )}
            </Card>
          )}

          <Card title="Pedidos / listas de compras">
            {orders.length === 0 ? (
              <p className="text-sm text-slate-400">Nenhuma lista com este fornecedor.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {orders.map((order) => (
                  <li key={order.id}>
                    <Link href={`/listas/${order.id}`} className="flex min-h-11 items-center gap-2 py-1.5 hover:text-brand-700">
                      <ClipboardList className="size-4 shrink-0 text-slate-400" aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{order.title}</span>
                        <span className="block text-xs text-slate-500">
                          {formatDateBr(order.orderDate)} · {order.itemCount} {order.itemCount === 1 ? "item" : "itens"}
                        </span>
                      </span>
                      <PurchaseStatusBadge status={order.status} />
                      <span className="text-sm font-semibold tabular-nums">{formatMoney(order.total)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href={`/listas/nova?fornecedor=${supplier.id}`}
              className={buttonClasses("secondary", "md", "mt-3 w-full")}
            >
              <Plus className="size-4" aria-hidden />
              Nova lista de compras
            </Link>
          </Card>

          <Card title="Observações" className={hasPortal ? "" : "lg:col-span-1"}>
            {supplier.notes ? (
              <p className="text-sm break-words whitespace-pre-wrap text-slate-800">{supplier.notes}</p>
            ) : (
              <p className="text-sm text-slate-400">Nenhuma observação.</p>
            )}
          </Card>
        </div>
      </PageContainer>
    </>
  );
}
