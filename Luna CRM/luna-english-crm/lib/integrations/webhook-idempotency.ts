export interface FacebookWebhookEntry {
  id?: string | number;
  time?: string | number;
}

export function getFacebookIdempotencyFields(entry: FacebookWebhookEntry) {
  if (!entry.id || !entry.time) return null;
  return {
    entryId: String(entry.id),
    entryTime: String(entry.time),
  };
}

export interface ZaloWebhookEvent {
  message?: { msg_id?: string | number };
}

export function getZaloMessageId(event: ZaloWebhookEvent): string | null {
  const raw = event.message?.msg_id;
  if (!raw) return null;
  return String(raw);
}
