"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, KeyRound, Loader2, Save, Star, Trash2 } from "lucide-react";
import { saveSupplierAction } from "@/app/actions/suppliers";
import { BrandTagInput } from "@/components/tags/BrandTagInput";
import { CategorySelector } from "@/components/tags/CategorySelector";
import { ProductTagInput } from "@/components/tags/ProductTagInput";
import { useToast } from "@/components/ui/Toast";
import { buttonClasses } from "@/components/ui/button";
import { Field, inputClasses } from "@/components/ui/field";
import { useDuplicateCheck } from "@/hooks/useDuplicateCheck";
import { validateSupplier } from "@/lib/validation/supplier";
import type { Brand, Category, PasswordAction, Product, Supplier, SupplierFormInput } from "@/types/supplier";
import { formatPhone } from "@/utils/phone";
import { BRAZILIAN_STATES } from "@/utils/states";
import { DuplicateWarning } from "./DuplicateWarning";
import { FormSection } from "./FormSection";

interface SupplierFormProps {
  supplier?: Supplier;
  categories: Category[];
  products: Product[];
  brands: Brand[];
}

type FieldName = keyof SupplierFormInput;

function initialValues(supplier?: Supplier): SupplierFormInput {
  return {
    name: supplier?.name ?? "",
    tradeName: supplier?.tradeName ?? "",
    contactName: supplier?.contactName ?? "",
    whatsapp: supplier?.whatsapp ? formatPhone(supplier.whatsapp) : "",
    phone: supplier?.phone ? formatPhone(supplier.phone) : "",
    email: supplier?.email ?? "",
    website: supplier?.website ?? "",
    instagram: supplier?.instagram ? `@${supplier.instagram}` : "",
    city: supplier?.city ?? "",
    state: supplier?.state ?? "",
    notes: supplier?.notes ?? "",
    portalUrl: supplier?.portalUrl ?? "",
    portalLogin: supplier?.portalLogin ?? "",
    portalPassword: "",
    passwordAction: "keep",
    isFavorite: supplier?.isFavorite ?? false,
    products: supplier?.products.map((p) => p.name) ?? [],
    brands: supplier?.brands.map((b) => b.name) ?? [],
    categoryIds: supplier?.categories.map((c) => c.id) ?? [],
  };
}

/** Formulário de cadastro/edição dividido em 6 seções. */
export function SupplierForm({ supplier, categories: initialCategories, products, brands }: SupplierFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [values, setValues] = useState<SupplierFormInput>(() => initialValues(supplier));
  const [categories, setCategories] = useState(initialCategories);
  const [error, setError] = useState<{ message: string; field?: FieldName } | null>(null);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [editingPassword, setEditingPassword] = useState(!supplier?.hasPortalPassword);

  const duplicates = useDuplicateCheck(
    { name: values.name, whatsapp: values.whatsapp, email: values.email, website: values.website },
    supplier?.id,
  );

  function set<K extends FieldName>(field: K, value: SupplierFormInput[K]) {
    setValues((current) => ({ ...current, [field]: value }));
    if (error?.field === field) setError(null);
  }

  const fieldError = (field: FieldName) => (error?.field === field ? error.message : null);
  const describedBy = (field: FieldName) => (error?.field === field ? `${field}-error` : undefined);

  function passwordAction(): PasswordAction {
    if (values.passwordAction === "clear") return "clear";
    return editingPassword && values.portalPassword ? "set" : "keep";
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input: SupplierFormInput = { ...values, passwordAction: passwordAction() };
    const validation = validateSupplier(input);
    if (!validation.ok) {
      setError({ message: validation.error, field: validation.field });
      if (validation.field) document.getElementById(validation.field)?.focus();
      return;
    }

    setSaving(true);
    setError(null);
    const result = await saveSupplierAction(supplier?.id ?? null, input);
    if (!result.ok) {
      setSaving(false);
      setError({ message: result.error });
      return;
    }
    toast(supplier ? "Fornecedor atualizado" : "Fornecedor cadastrado");
    router.replace(`/fornecedores/${result.data.id}`);
    router.refresh();
  }

  const input = (field: FieldName, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <input
      id={field}
      name={field}
      value={values[field] as string}
      onChange={(event) => set(field, event.target.value as never)}
      aria-invalid={error?.field === field || undefined}
      aria-describedby={describedBy(field)}
      className={inputClasses(error?.field === field)}
      {...props}
    />
  );

  const hasPortalData = Boolean(values.portalUrl || values.portalLogin || supplier?.hasPortalPassword);

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-3">
      <FormSection step={1} title="Dados principais" description={values.name || "Nome, categorias"}>
        <div className="grid gap-3 md:grid-cols-2">
          <Field id="name" label="Nome do fornecedor / empresa *" error={fieldError("name")}>
            {input("name", { required: true, autoComplete: "organization", maxLength: 120, autoFocus: !supplier })}
          </Field>
          <Field id="tradeName" label="Nome fantasia" error={fieldError("tradeName")}>
            {input("tradeName", { maxLength: 120 })}
          </Field>
        </div>
        <div className="mt-3">
          <DuplicateWarning matches={duplicates} />
        </div>
        <div className="mt-3">
          <CategorySelector
            categories={categories}
            selectedIds={values.categoryIds}
            onChange={(ids) => set("categoryIds", ids)}
            onCategoryCreated={(category) =>
              setCategories((list) => [...list, category].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")))
            }
          />
        </div>
        <label className="mt-3 inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={values.isFavorite}
            onChange={(event) => set("isFavorite", event.target.checked)}
            className="size-5 rounded border-slate-300 accent-brand-600"
          />
          <Star className="size-4 fill-amber-400 text-amber-400" aria-hidden />
          Favorito
        </label>
      </FormSection>

      <FormSection step={2} title="Contato" description="Vendedor, WhatsApp, e-mail, site">
        <div className="grid gap-3 md:grid-cols-2">
          <Field id="contactName" label="Nome do vendedor / contato" error={fieldError("contactName")}>
            {input("contactName", { autoComplete: "name", maxLength: 120 })}
          </Field>
          <Field id="whatsapp" label="WhatsApp" hint="Com DDD. Ex.: (11) 98888-7777" error={fieldError("whatsapp")}>
            {input("whatsapp", { type: "tel", inputMode: "tel", autoComplete: "tel", maxLength: 25 })}
          </Field>
          <Field id="phone" label="Telefone" error={fieldError("phone")}>
            {input("phone", { type: "tel", inputMode: "tel", maxLength: 25 })}
          </Field>
          <Field id="email" label="E-mail" error={fieldError("email")}>
            {input("email", { type: "email", inputMode: "email", autoComplete: "email", maxLength: 120 })}
          </Field>
          <Field id="website" label="Site" error={fieldError("website")}>
            {input("website", { type: "url", inputMode: "url", placeholder: "www.exemplo.com.br", maxLength: 500 })}
          </Field>
          <Field id="instagram" label="Instagram" error={fieldError("instagram")}>
            {input("instagram", { placeholder: "@perfil", autoCapitalize: "none", maxLength: 120 })}
          </Field>
          <div className="grid grid-cols-[1fr_6.5rem] gap-3 md:col-span-2 md:grid-cols-[1fr_12rem]">
            <Field id="city" label="Cidade" error={fieldError("city")}>
              {input("city", { autoComplete: "address-level2", maxLength: 120 })}
            </Field>
            <Field id="state" label="Estado" error={fieldError("state")}>
              <select
                id="state"
                value={values.state}
                onChange={(event) => set("state", event.target.value)}
                className={inputClasses(error?.field === "state")}
              >
                <option value="">—</option>
                {BRAZILIAN_STATES.map((state) => (
                  <option key={state.uf} value={state.uf}>
                    {state.uf}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </div>
      </FormSection>

      <FormSection step={3} title="Produtos" description={values.products.join(", ") || "O que este fornecedor vende"}>
        <ProductTagInput
          values={values.products}
          onChange={(list) => set("products", list)}
          suggestions={products.map((p) => p.name)}
        />
        {fieldError("products") && <p className="mt-1 text-sm text-red-600">{fieldError("products")}</p>}
      </FormSection>

      <FormSection step={4} title="Marcas" description={values.brands.join(", ") || "Marcas comercializadas"}>
        <BrandTagInput
          values={values.brands}
          onChange={(list) => set("brands", list)}
          suggestions={brands.map((b) => b.name)}
        />
        {fieldError("brands") && <p className="mt-1 text-sm text-red-600">{fieldError("brands")}</p>}
      </FormSection>

      <FormSection step={5} title="Portal de compras" description="URL, login e senha" defaultOpen={hasPortalData}>
        <div className="grid gap-3 md:grid-cols-2">
          <Field id="portalUrl" label="URL do portal" error={fieldError("portalUrl")} className="md:col-span-2">
            {input("portalUrl", { type: "url", inputMode: "url", placeholder: "loja.fornecedor.com.br", maxLength: 500 })}
          </Field>
          <Field id="portalLogin" label="Login" error={fieldError("portalLogin")}>
            {input("portalLogin", { autoComplete: "off", autoCapitalize: "none", spellCheck: false, maxLength: 120 })}
          </Field>

          {editingPassword ? (
            <Field
              id="portalPassword"
              label="Senha"
              hint="Criptografada antes de ser salva."
              error={fieldError("portalPassword")}
            >
              <div className="relative">
                <input
                  id="portalPassword"
                  type={showPassword ? "text" : "password"}
                  value={values.portalPassword}
                  onChange={(event) => {
                    set("portalPassword", event.target.value);
                    set("passwordAction", "keep");
                  }}
                  autoComplete="new-password"
                  maxLength={256}
                  className={`${inputClasses(error?.field === "portalPassword")} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  className="absolute top-1/2 right-0.5 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                >
                  {showPassword ? <EyeOff className="size-5" aria-hidden /> : <Eye className="size-5" aria-hidden />}
                </button>
              </div>
              {supplier?.hasPortalPassword && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingPassword(false);
                    set("portalPassword", "");
                  }}
                  className="mt-1 text-sm text-brand-600 hover:underline"
                >
                  Manter senha atual
                </button>
              )}
            </Field>
          ) : (
            <div className="min-w-0">
              <p className="mb-1 block text-sm font-medium text-slate-700">Senha</p>
              {values.passwordAction === "clear" ? (
                <div className="flex h-11 items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50 px-3 text-sm text-red-700">
                  Senha será removida
                  <button type="button" onClick={() => set("passwordAction", "keep")} className="font-medium underline">
                    Desfazer
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex h-11 items-center gap-2 rounded-lg bg-slate-100 px-3 text-sm text-slate-600">
                    <KeyRound className="size-4" aria-hidden />
                    Senha salva
                  </span>
                  <button type="button" onClick={() => setEditingPassword(true)} className={buttonClasses("secondary", "sm")}>
                    Alterar
                  </button>
                  <button
                    type="button"
                    onClick={() => set("passwordAction", "clear")}
                    aria-label="Remover senha salva"
                    className={buttonClasses("ghost", "icon", "text-red-600")}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </FormSection>

      <FormSection step={6} title="Observações" description="Pedido mínimo, frete, condições..." defaultOpen={Boolean(values.notes)}>
        <label htmlFor="notes" className="sr-only">
          Observações
        </label>
        <textarea
          id="notes"
          value={values.notes}
          onChange={(event) => set("notes", event.target.value)}
          rows={4}
          maxLength={4000}
          placeholder={"Pedido mínimo R$ 500\nFrete grátis acima de R$ 1.000"}
          className={`${inputClasses(error?.field === "notes")} h-auto py-2`}
        />
      </FormSection>

      {error && !error.field && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error.message}
        </p>
      )}
      {error?.field && (
        <p role="alert" className="sr-only">
          {error.message}
        </p>
      )}

      <div className="safe-bottom sticky bottom-0 z-20 -mx-4 flex gap-2 border-t border-slate-200 bg-white/95 px-4 pt-3 backdrop-blur md:static md:mx-0 md:justify-end md:border-0 md:bg-transparent md:px-0 md:pb-0">
        <button
          type="button"
          onClick={() => router.back()}
          className={buttonClasses("secondary", "md", "flex-1 md:flex-none")}
        >
          Cancelar
        </button>
        <button type="submit" disabled={saving} className={buttonClasses("primary", "md", "flex-[2] md:flex-none md:px-6")}>
          {saving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Save className="size-4" aria-hidden />}
          Salvar
        </button>
      </div>
    </form>
  );
}
