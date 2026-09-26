"use client";

import { TagInput } from "./TagInput";

interface Props {
  values: string[];
  onChange: (values: string[]) => void;
  suggestions: string[];
}

export function BrandTagInput({ values, onChange, suggestions }: Props) {
  return (
    <TagInput
      id="brands"
      label="Marcas comercializadas"
      values={values}
      onChange={onChange}
      suggestions={suggestions}
      placeholder="Ex.: Baseus, Rock, Samsung"
      hint="Pressione Enter ou vírgula para adicionar."
    />
  );
}
