import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { PurchaseListEditor } from "@/components/purchases/PurchaseListEditor";
import { getItemSuggestions, getPurchaseList, getSupplierOptions } from "@/lib/data/purchase-lists";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Lista de compras" };

export default async function PurchaseListPage({ params }: PageProps<"/listas/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const [list, suppliers, suggestions] = await Promise.all([
    getPurchaseList(supabase, id),
    getSupplierOptions(supabase),
    getItemSuggestions(supabase),
  ]);
  if (!list) notFound();

  return (
    <>
      <AppHeader title="Lista de compras" backHref="/listas" />
      <PageContainer>
        <div className="mx-auto max-w-7xl">
          <PurchaseListEditor list={list} suppliers={suppliers} suggestions={suggestions} />
        </div>
      </PageContainer>
    </>
  );
}
