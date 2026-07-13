function safeKeyPart(value: string): string {
  return value.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 180);
}

export function burstIdWithoutSender(sourceId: string, messageId: string): string {
  return `burst:${safeKeyPart(sourceId)}:message:${safeKeyPart(messageId)}`;
}
