import type { Metadata } from "next";
import { AppHeader } from "@/components/layout/AppHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { NewPurchaseListForm } from "@/components/purchases/NewPurchaseListForm";
import { getSupplierOptions } from "@/lib/data/purchase-lists";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Nova lista" };

export default async function NewPurchaseListPage({ searchParams }: PageProps<"/listas/nova">) {
  const { fornecedor } = await searchParams;
  const suppliers = await getSupplierOptions(await createClient());
  const defaultSupplierId =
    typeof fornecedor === "string" && suppliers.some((s) => s.id === fornecedor) ? fornecedor : null;
  return (
    <>
      <AppHeader title="Nova lista de compras" backHref="/listas" />
      <PageContainer narrow>
        <NewPurchaseListForm suppliers={suppliers} defaultSupplierId={defaultSupplierId} />
      </PageContainer>
    </>
  );
}
