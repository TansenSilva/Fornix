import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { SupplierForm } from "@/components/suppliers/SupplierForm";
import { getSupplier } from "@/lib/data/suppliers";
import { getTaxonomy } from "@/lib/data/taxonomy";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Editar fornecedor" };

export default async function EditSupplierPage({ params }: PageProps<"/fornecedores/[id]/editar">) {
  const { id } = await params;
  const supabase = await createClient();
  const [supplier, taxonomy] = await Promise.all([getSupplier(supabase, id), getTaxonomy(supabase)]);
  if (!supplier) notFound();

  return (
    <>
      <AppHeader title="Editar fornecedor" backHref={`/fornecedores/${supplier.id}`} />
      <PageContainer narrow>
        <SupplierForm
          supplier={supplier}
          categories={taxonomy.categories}
          products={taxonomy.products}
          brands={taxonomy.brands}
        />
      </PageContainer>
    </>
  );
}
