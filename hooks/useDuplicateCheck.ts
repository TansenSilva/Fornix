"use client";

import { useEffect, useState } from "react";
import { findSimilarSuppliers } from "@/lib/data/suppliers";
import { createClient } from "@/lib/supabase/client";
import type { SimilarSupplier } from "@/types/supplier";
import { normalizePhone } from "@/utils/phone";
import { normalizeUrl } from "@/utils/url";
import { useDebouncedValue } from "./useDebouncedValue";

interface DuplicateFields {
  name: string;
  whatsapp: string;
  email: string;
  website: string;
}

/** Procura fornecedores parecidos (nome, WhatsApp, e-mail, site) enquanto o usuário digita. */
export function useDuplicateCheck(fields: DuplicateFields, excludeId?: string): SimilarSupplier[] {
  // Debounce da string (comparada por valor) para não re-renderizar em loop.
  const key = useDebouncedValue(JSON.stringify(fields), 600);
  const [matches, setMatches] = useState<SimilarSupplier[]>([]);

  useEffect(() => {
    const value = JSON.parse(key) as DuplicateFields;
    const params = {
      name: value.name.trim().length >= 3 ? value.name.trim() : "",
      whatsapp: normalizePhone(value.whatsapp),
      email: value.email.trim().toLowerCase(),
      website: normalizeUrl(value.website),
      excludeId,
    };
    let cancelled = false;
    const run = async () => {
      if (!params.name && !params.whatsapp && !params.email && !params.website) {
        if (!cancelled) setMatches([]);
        return;
      }
      try {
        const result = await findSimilarSuppliers(createClient(), params);
        if (!cancelled) setMatches(result);
      } catch {
        // Aviso de duplicidade é opcional: falhas são ignoradas.
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [key, excludeId]);

  return matches;
}
