import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { PurchaseListsBrowser } from "@/components/purchases/PurchaseListsBrowser";
import { buttonClasses } from "@/components/ui/button";
import { getPurchaseListSummaries } from "@/lib/data/purchase-lists";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Listas de compras" };

export default async function PurchaseListsPage() {
  const lists = await getPurchaseListSummaries(await createClient());
  return (
    <>
      <AppHeader
        title="Listas de compras"
        backHref="/"
        actions={
          <Link href="/listas/nova" className={buttonClasses("primary", "sm", "-mr-1")}>
            <Plus className="size-4" aria-hidden />
            Nova lista
          </Link>
        }
      />
      <PageContainer>
        <PurchaseListsBrowser lists={lists} />
      </PageContainer>
    </>
  );
}
