import dns from "node:dns/promises";
import net from "node:net";
import { AppError } from "../utils/errors";

const BLOCKED_HOSTNAMES = new Set(["localhost", "metadata.google.internal"]);
const CLOUD_METADATA_IPV4 = "169.254.169.254";

export async function assertCrawlableUrl(input: string): Promise<URL> {
  let url: URL;

  try {
    url = new URL(input);
  } catch {
    throw new AppError(400, "INVALID_URL", "URL must be a valid absolute URL.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new AppError(400, "UNSUPPORTED_URL_PROTOCOL", "Only http and https URLs can be scanned.");
  }

  const hostname = url.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    throw new AppError(400, "PRIVATE_URL_REJECTED", "Private or local network URLs cannot be scanned.");
  }

  if (net.isIP(hostname) && isPrivateAddress(hostname)) {
    throw new AppError(400, "PRIVATE_URL_REJECTED", "Private or local network URLs cannot be scanned.");
  }

  const addresses = await dns.lookup(hostname, { all: true, verbatim: true });
  if (addresses.some((address) => isPrivateAddress(address.address))) {
    throw new AppError(400, "PRIVATE_URL_REJECTED", "Private or local network URLs cannot be scanned.");
  }

  return url;
}

function isPrivateAddress(address: string): boolean {
  if (address === CLOUD_METADATA_IPV4) return true;

  const ipVersion = net.isIP(address);
  if (ipVersion === 4) return isPrivateIpv4(address);
  if (ipVersion === 6) return isPrivateIpv6(address);
  return false;
}

function isPrivateIpv4(address: string): boolean {
  const parts = address.split(".").map((part) => Number.parseInt(part, 10));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) return true;

  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 169 && b === 254)
  );
}

function isPrivateIpv6(address: string): boolean {
  const normalized = address.toLowerCase();
  return (
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80:")
  );
}
