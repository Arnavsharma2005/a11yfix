import crypto from "node:crypto";
import { config } from "../config";
import { AppError } from "../utils/errors";

const ALGORITHM = "aes-256-gcm";
const VERSION = "v1";

export function encryptToken(token: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [VERSION, iv.toString("base64"), tag.toString("base64"), ciphertext.toString("base64")].join(":");
}

export function decryptToken(encryptedToken: string): string {
  if (!encryptedToken) {
    throw new AppError(401, "GITHUB_TOKEN_MISSING", "GitHub access token is missing.");
  }

  const [version, ivRaw, tagRaw, ciphertextRaw] = encryptedToken.split(":");
  if (version !== VERSION || !ivRaw || !tagRaw || !ciphertextRaw) {
    throw new AppError(500, "INVALID_TOKEN_FORMAT", "Stored GitHub token is not in a supported format.");
  }

  const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), Buffer.from(ivRaw, "base64"));
  decipher.setAuthTag(Buffer.from(tagRaw, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextRaw, "base64")),
    decipher.final()
  ]);

  return plaintext.toString("utf8");
}

function getEncryptionKey(): Buffer {
  const raw = config.tokenEncryptionKey;
  if (!raw) {
    throw new AppError(
      500,
      "TOKEN_ENCRYPTION_KEY_MISSING",
      "TOKEN_ENCRYPTION_KEY must be set before storing or reading GitHub tokens."
    );
  }

  const key = /^[0-9a-f]{64}$/i.test(raw) ? Buffer.from(raw, "hex") : Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new AppError(500, "TOKEN_ENCRYPTION_KEY_INVALID", "TOKEN_ENCRYPTION_KEY must decode to 32 bytes.");
  }

  return key;
}
