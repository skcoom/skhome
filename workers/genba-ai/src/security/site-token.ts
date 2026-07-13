const encoder = new TextEncoder();
const siteIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

async function signature(siteId: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return toBase64Url(new Uint8Array(
    await crypto.subtle.sign("HMAC", key, encoder.encode(`genba-site:${siteId}`)),
  ));
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

export async function createSiteToken(siteId: string, secret: string): Promise<string> {
  if (!siteIdPattern.test(siteId)) throw new Error("A valid site id is required");
  return `${siteId}.${await signature(siteId, secret)}`;
}

export async function verifySiteToken(token: string, secret: string): Promise<string | null> {
  const separator = token.lastIndexOf(".");
  if (separator < 0) return null;
  const siteId = token.slice(0, separator);
  const supplied = token.slice(separator + 1);
  if (!siteIdPattern.test(siteId) || supplied.length === 0) return null;
  return constantTimeEqual(await signature(siteId, secret), supplied) ? siteId : null;
}
