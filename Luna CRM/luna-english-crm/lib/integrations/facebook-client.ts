import crypto from "crypto";

interface WebhookVerifyParams {
  "hub.mode"?: string;
  "hub.verify_token"?: string;
  "hub.challenge"?: string;
}

/**
 * Verify Facebook webhook subscription request.
 * Returns the challenge string if valid, null otherwise.
 */
export function verifyWebhook(params: WebhookVerifyParams): string | null {
  const mode = params["hub.mode"];
  const token = params["hub.verify_token"];
  const challenge = params["hub.challenge"];
  const verifyToken = process.env.FACEBOOK_VERIFY_TOKEN;

  if (mode === "subscribe" && token === verifyToken && challenge) {
    return challenge;
  }
  return null;
}

/**
 * Verify Facebook webhook payload signature (X-Hub-Signature-256).
 */
export function verifyPayloadSignature(
  body: string,
  signature: string
): boolean {
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  if (!appSecret || !signature) return false;

  const hmac = crypto.createHmac("sha256", appSecret);
  hmac.update(body);
  const expected = `sha256=${hmac.digest("hex")}`;

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(signature)
    );
  } catch {
    return false;
  }
}

interface FacebookLeadField {
  name: string;
  values: string[];
}

interface FacebookLeadData {
  id: string;
  field_data?: FacebookLeadField[];
  created_time?: string;
}

/**
 * Fetch lead data from Facebook Lead Ads API.
 */
export async function fetchLeadData(
  accessToken: string,
  leadgenId: string
): Promise<FacebookLeadData | null> {
  const res = await fetch(
    `https://graph.facebook.com/v19.0/${leadgenId}?access_token=${accessToken}`,
    { method: "GET" }
  );

  if (!res.ok) return null;
  return res.json() as Promise<FacebookLeadData>;
}

/**
 * Map Facebook lead field_data array to CRM lead schema fields.
 */
export function mapLeadFieldsToSchema(
  fieldData: FacebookLeadField[]
): Record<string, string | null> {
  const mapped: Record<string, string | null> = {
    parent_name: null,
    parent_phone: null,
    parent_email: null,
    student_name: null,
  };

  for (const field of fieldData) {
    const value = field.values?.[0] ?? null;
    switch (field.name.toLowerCase()) {
      case "full_name":
        mapped.parent_name = value;
        break;
      case "phone_number":
        mapped.parent_phone = value;
        break;
      case "email":
        mapped.parent_email = value;
        break;
      case "child_name":
      case "student_name":
        mapped.student_name = value;
        break;
    }
  }

  return mapped;
}
