"use client";

import { useEffect, useLayoutEffect, useRef } from "react";

type Props = React.TextareaHTMLAttributes<HTMLTextAreaElement> & { value: string };

/** Campo de texto de uma linha que quebra e cresce para mostrar o conteúdo inteiro. */
export function AutoTextarea({ value, className = "", onKeyDown, ...props }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const resize = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + 2}px`;
  };

  useLayoutEffect(resize, [value]);
  useEffect(() => {
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      onKeyDown={(event) => {
        // Enter não cria linha nova: confirma o campo (como numa planilha).
        if (event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.blur();
        }
        onKeyDown?.(event);
      }}
      className={`block resize-none overflow-hidden leading-5 ${className}`}
      {...props}
    />
  );
}
