/**
 * Identidade do aplicativo. Altere aqui para trocar nome, descrição e cores
 * (o manifest da PWA e os metadados usam estes valores).
 * Os ícones ficam em /public/icons — veja o README para substituí-los.
 */
export const appConfig = {
  name: "Meus Fornecedores",
  shortName: "Fornecedores",
  description: "Agenda e catálogo pessoal de fornecedores.",
  themeColor: "#ffffff",
  backgroundColor: "#f8fafc",
  /** Código do país usado para normalizar números de WhatsApp. */
  defaultCountryCode: "55",
} as const;
