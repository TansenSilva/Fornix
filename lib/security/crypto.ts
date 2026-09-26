import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Criptografia das senhas dos portais de fornecedores.
 *
 * - Algoritmo: AES-256-GCM (confidencialidade + integridade).
 * - Chave: CREDENTIALS_ENCRYPTION_KEY (32 bytes em base64), existe SOMENTE no
 *   servidor (Vercel/.env.local). Nunca vai para o navegador nem para o banco.
 * - IV aleatório de 12 bytes por senha.
 * - AAD = id do usuário: um texto cifrado copiado para a conta de outro usuário
 *   não pode ser decifrado.
 * - Formato armazenado: "v1:<iv>:<tag>:<ciphertext>" (base64). O prefixo de
 *   versão permite trocar de chave/algoritmo no futuro.
 */
const VERSION = "v1";
const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
  const raw = process.env.CREDENTIALS_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("CREDENTIALS_ENCRYPTION_KEY não configurada. Veja o README.");
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("CREDENTIALS_ENCRYPTION_KEY deve ter 32 bytes codificados em base64.");
  }
  return key;
}

export function encryptSecret(plainText: string, userId: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  cipher.setAAD(Buffer.from(userId, "utf8"));
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64"), tag.toString("base64"), encrypted.toString("base64")].join(":");
}

export function decryptSecret(payload: string, userId: string): string {
  const [version, ivB64, tagB64, dataB64] = payload.split(":");
  if (version !== VERSION || !ivB64 || !tagB64 || !dataB64) {
    throw new Error("Formato de senha criptografada inválido.");
  }
  const decipher = createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivB64, "base64"));
  decipher.setAAD(Buffer.from(userId, "utf8"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
