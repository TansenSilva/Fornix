"use client";

import { useId, useMemo, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { cleanLabel, normalizeText } from "@/utils/text";

export interface TagInputProps {
  id: string;
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  /** Itens já cadastrados — usados no autocomplete para evitar duplicidade. */
  suggestions: string[];
  placeholder?: string;
  hint?: string;
  maxLength?: number;
}

const MAX_SUGGESTIONS = 8;

/**
 * Campo de tags com autocomplete. Ao digitar "pel" sugere "Películas".
 * Se o texto digitado for igual (ignorando acentos/caixa) a um item existente,
 * usa a grafia já cadastrada — assim "pelicula" vira "Película".
 */
export function TagInput({
  id,
  label,
  values,
  onChange,
  suggestions,
  placeholder = "Digite e pressione Enter",
  hint,
  maxLength = 80,
}: TagInputProps) {
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const selectedKeys = useMemo(() => new Set(values.map(normalizeText)), [values]);
  const canonical = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of suggestions) map.set(normalizeText(item), item);
    return map;
  }, [suggestions]);

  const typedKey = normalizeText(text);
  const options = useMemo(() => {
    if (!typedKey) return [];
    const available = suggestions.filter((item) => !selectedKeys.has(normalizeText(item)));
    const starts = available.filter((item) => normalizeText(item).startsWith(typedKey));
    const contains = available.filter(
      (item) => !normalizeText(item).startsWith(typedKey) && normalizeText(item).includes(typedKey),
    );
    const list = [...starts, ...contains].slice(0, MAX_SUGGESTIONS).map((item) => ({ value: item, isNew: false }));
    const exists = canonical.has(typedKey) || selectedKeys.has(typedKey);
    if (!exists) list.push({ value: cleanLabel(text), isNew: true });
    return list;
  }, [typedKey, text, suggestions, selectedKeys, canonical]);

  function add(raw: string) {
    const parts = raw.split(/[,;\n]/).map(cleanLabel).filter(Boolean);
    const next = [...values];
    const keys = new Set(selectedKeys);
    for (const part of parts) {
      const key = normalizeText(part);
      if (!key || keys.has(key)) continue;
      keys.add(key);
      next.push((canonical.get(key) ?? part).slice(0, maxLength));
    }
    if (next.length !== values.length) onChange(next);
    setText("");
    setHighlight(0);
  }

  function remove(value: string) {
    onChange(values.filter((item) => item !== value));
    inputRef.current?.focus();
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" && options.length > 0) {
      event.preventDefault();
      setOpen(true);
      setHighlight((index) => (index + 1) % options.length);
    } else if (event.key === "ArrowUp" && options.length > 0) {
      event.preventDefault();
      setHighlight((index) => (index - 1 + options.length) % options.length);
    } else if (event.key === "Enter" || event.key === ",") {
      if (!text.trim()) return;
      event.preventDefault();
      const option = open ? options[highlight] : undefined;
      add(option ? option.value : text);
    } else if (event.key === "Escape" && open) {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
    } else if (event.key === "Backspace" && !text && values.length > 0) {
      onChange(values.slice(0, -1));
    }
  }

  const showList = open && options.length > 0;
  const hintId = hint ? `${id}-hint` : undefined;

  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <div className="relative">
        <div
          className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1.5 focus-within:border-brand-600 focus-within:ring-2 focus-within:ring-brand-100"
          onClick={() => inputRef.current?.focus()}
        >
          {values.map((value) => (
            <span
              key={value}
              className="inline-flex max-w-full items-center gap-0.5 rounded-md bg-slate-100 py-0.5 pr-0.5 pl-2 text-sm text-slate-700"
            >
              <span className="truncate">{value}</span>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  remove(value);
                }}
                aria-label={`Remover ${value}`}
                className="inline-flex size-7 shrink-0 items-center justify-center rounded text-slate-500 hover:bg-slate-200 hover:text-slate-800"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </span>
          ))}
          <input
            ref={inputRef}
            id={id}
            type="text"
            role="combobox"
            aria-expanded={showList}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-describedby={hintId}
            aria-activedescendant={showList ? `${listId}-${highlight}` : undefined}
            autoComplete="off"
            autoCapitalize="sentences"
            enterKeyHint="enter"
            value={text}
            maxLength={maxLength * 4}
            placeholder={values.length === 0 ? placeholder : "Adicionar..."}
            onChange={(event) => {
              const value = event.target.value;
              if (/[,;]/.test(value)) {
                add(value);
                return;
              }
              setText(value);
              setOpen(true);
              setHighlight(0);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => {
              if (text.trim()) add(text);
              setOpen(false);
            }}
            onKeyDown={onKeyDown}
            className="h-8 min-w-32 flex-1 bg-transparent px-1 text-base outline-none placeholder:text-slate-400"
          />
        </div>
        {showList && (
          <ul
            id={listId}
            role="listbox"
            aria-label={`Sugestões de ${label.toLowerCase()}`}
            className="absolute inset-x-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
          >
            {options.map((option, index) => (
              <li
                key={`${option.isNew ? "new" : "old"}-${option.value}`}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === highlight}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => add(option.value)}
                onMouseEnter={() => setHighlight(index)}
                className={`flex cursor-pointer items-center gap-2 px-3 py-2.5 text-sm ${
                  index === highlight ? "bg-brand-50 text-brand-700" : "text-slate-700"
                }`}
              >
                {option.isNew ? (
                  <>
                    <Plus className="size-4 shrink-0" aria-hidden />
                    <span className="truncate">
                      Adicionar &ldquo;{option.value}&rdquo;
                    </span>
                  </>
                ) : (
                  <span className="truncate">{option.value}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      {hint && (
        <p id={hintId} className="mt-1 text-xs text-slate-500">
          {hint}
        </p>
      )}
    </div>
  );
}
