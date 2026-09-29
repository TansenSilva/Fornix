/** Abre a impressão do navegador usando `title` como nome sugerido do PDF. */
export function printWithTitle(title: string): void {
  const previousTitle = document.title;
  document.title = title;
  window.addEventListener(
    "afterprint",
    () => {
      document.title = previousTitle;
    },
    { once: true },
  );
  window.print();
}
