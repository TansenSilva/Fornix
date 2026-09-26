import type { Metadata } from "next";
import { AppHeader } from "@/components/layout/AppHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { CategoryManager } from "@/components/tags/CategoryManager";
import { getCategoriesWithUsage } from "@/lib/data/taxonomy";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Categorias" };

export default async function CategoriesPage() {
  const categories = await getCategoriesWithUsage(await createClient());
  return (
    <>
      <AppHeader title="Categorias" backHref="/" />
      <PageContainer narrow>
        <CategoryManager initialCategories={categories} />
      </PageContainer>
    </>
  );
}
