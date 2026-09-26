"use client";

import Link from "next/link";
import { Copy, ExternalLink, Globe, AtSign, Mail, MessageCircle, Pencil, Phone, Store } from "lucide-react";
import { ActionMenu, type ActionMenuItem } from "@/components/ui/ActionMenu";
import { buttonClasses } from "@/components/ui/button";
import { useCopy } from "@/hooks/useCopy";
import type { Supplier } from "@/types/supplier";
import { formatPhone, telLink, whatsappLink } from "@/utils/phone";
import { normalizeText } from "@/utils/text";
import { instagramLink, safeHref } from "@/utils/url";
import { FavoriteButton } from "./FavoriteButton";

interface SupplierCardProps {
  supplier: Supplier;
  /** Termos buscados: itens que batem com a busca aparecem primeiro. */
  searchTerms: string[];
  favoriteBusy?: boolean;
  onToggleFavorite: (supplier: Supplier) => void;
}

function prioritize(names: string[], terms: string[]): string[] {
  if (terms.length === 0) return names;
  const matches = (name: string) => terms.some((term) => normalizeText(name).includes(term));
  return [...names.filter(matches), ...names.filter((name) => !matches(name))];
}

export function SupplierCard({ supplier, searchTerms, favoriteBusy, onToggleFavorite }: SupplierCardProps) {
  const copy = useCopy();
  const website = safeHref(supplier.website);
  const portal = safeHref(supplier.portalUrl);
  const detailsHref = `/fornecedores/${supplier.id}`;

  const products = prioritize(supplier.products.map((p) => p.name), searchTerms);
  const brands = prioritize(supplier.brands.map((b) => b.name), searchTerms);
  const location = [supplier.city, supplier.state].filter(Boolean).join("/");
  const subtitle = [supplier.contactName, location].filter(Boolean).join(" · ");

  // Botão principal de link: site; se não houver, portal.
  const primaryLink = website
    ? { href: website, label: "Site", icon: <Globe className="size-4" aria-hidden /> }
    : portal
      ? { href: portal, label: "Portal", icon: <Store className="size-4" aria-hidden /> }
      : null;

  const phoneForCall = supplier.phone ?? supplier.whatsapp;
  const menu: ActionMenuItem[] = [];
  if (phoneForCall) {
    menu.push({ label: "Ligar", href: telLink(phoneForCall), icon: <Phone className="size-4" aria-hidden /> });
  }
  if (supplier.email) {
    menu.push({ label: "Enviar e-mail", href: `mailto:${supplier.email}`, icon: <Mail className="size-4" aria-hidden /> });
  }
  if (website && portal) {
    menu.push({ label: "Portal do fornecedor", href: portal, external: true, icon: <ExternalLink className="size-4" aria-hidden /> });
  }
  if (supplier.instagram) {
    menu.push({
      label: "Instagram",
      href: instagramLink(supplier.instagram),
      external: true,
      icon: <AtSign className="size-4" aria-hidden />,
    });
  }
  if (supplier.whatsapp) {
    const number = formatPhone(supplier.whatsapp);
    menu.push({ label: "Copiar WhatsApp", onSelect: () => copy(number), icon: <Copy className="size-4" aria-hidden /> });
  }
  if (supplier.email) {
    const email = supplier.email;
    menu.push({ label: "Copiar e-mail", onSelect: () => copy(email), icon: <Copy className="size-4" aria-hidden /> });
  }
  menu.push({ label: "Editar", href: `${detailsHref}/editar`, icon: <Pencil className="size-4" aria-hidden /> });

  return (
    <article className="flex min-w-0 flex-col rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[15px] leading-6 font-semibold tracking-wide uppercase">
            <Link href={detailsHref} className="hover:text-brand-700 focus-visible:text-brand-700">
              {supplier.name}
            </Link>
          </h2>
          {subtitle && <p className="truncate text-sm text-slate-500">{subtitle}</p>}
        </div>
        <FavoriteButton
          isFavorite={supplier.isFavorite}
          disabled={favoriteBusy}
          supplierName={supplier.name}
          onToggle={() => onToggleFavorite(supplier)}
        />
      </div>

      {(products.length > 0 || brands.length > 0) && (
        <div className="mt-1.5 space-y-0.5 text-sm">
          {products.length > 0 && (
            <p className="line-clamp-1 text-slate-700" title={products.join(" • ")}>
              <span className="sr-only">Produtos: </span>
              {products.join(" • ")}
            </p>
          )}
          {brands.length > 0 && (
            <p className="line-clamp-1 text-slate-500" title={brands.join(" • ")}>
              <span className="sr-only">Marcas: </span>
              {brands.join(" • ")}
            </p>
          )}
        </div>
      )}

      <div className="mt-auto flex items-center gap-1.5 pt-3">
        {supplier.whatsapp && (
          <a
            href={whatsappLink(supplier.whatsapp)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Abrir WhatsApp de ${supplier.name}`}
            className={buttonClasses("whatsapp", "sm", "min-w-0 flex-auto px-2.5")}
          >
            <MessageCircle className="size-4 shrink-0" aria-hidden />
            <span className="truncate">WhatsApp</span>
          </a>
        )}
        {primaryLink && (
          <a
            href={primaryLink.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${primaryLink.label} de ${supplier.name} (abre em nova aba)`}
            className={buttonClasses("secondary", "sm", "min-w-0 flex-auto px-2.5")}
          >
            <span className="hidden shrink-0 min-[400px]:inline">{primaryLink.icon}</span>
            <span className="truncate">{primaryLink.label}</span>
          </a>
        )}
        <Link
          href={detailsHref}
          aria-label={`Detalhes de ${supplier.name}`}
          className={buttonClasses("secondary", "sm", "min-w-0 flex-auto px-2.5")}
        >
          <span className="truncate">Detalhes</span>
        </Link>
        <ActionMenu items={menu} label={`Mais ações para ${supplier.name}`} />
      </div>
    </article>
  );
}
