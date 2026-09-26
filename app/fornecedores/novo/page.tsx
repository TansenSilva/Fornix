import type { Metadata } from "next";
import { AppHeader } from "@/components/layout/AppHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { SupplierForm } from "@/components/suppliers/SupplierForm";
import { getTaxonomy } from "@/lib/data/taxonomy";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Novo fornecedor" };

export default async function NewSupplierPage() {
  const taxonomy = await getTaxonomy(await createClient());
  return (
    <>
      <AppHeader title="Novo fornecedor" backHref="/" />
      <PageContainer narrow>
        <SupplierForm categories={taxonomy.categories} products={taxonomy.products} brands={taxonomy.brands} />
      </PageContainer>
    </>
  );
}
