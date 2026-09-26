"use client";

import { TagInput } from "./TagInput";

interface Props {
  values: string[];
  onChange: (values: string[]) => void;
  suggestions: string[];
}

export function ProductTagInput({ values, onChange, suggestions }: Props) {
  return (
    <TagInput
      id="products"
      label="Produtos vendidos"
      values={values}
      onChange={onChange}
      suggestions={suggestions}
      placeholder="Ex.: Capas, Películas, Carregadores"
      hint="Pressione Enter ou vírgula para adicionar. Sugestões evitam itens repetidos."
    />
  );
}
