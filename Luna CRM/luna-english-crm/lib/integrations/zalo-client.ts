import crypto from "crypto";

/**
 * Verify Zalo OA webhook signature using HMAC-SHA256.
 * Zalo sends X-Zalo-Signature header with each webhook request.
 */
export function verifySignature(
  body: string,
  signature: string,
  secret: string
): boolean {
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(body);
  const computed = hmac.digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(computed, "hex"),
    Buffer.from(signature, "hex")
  );
}

interface ZaloApiResponse {
  error: number;
  message: string;
  data?: Record<string, unknown>;
}

/**
 * Send a text message to a Zalo user via OA API.
 */
export async function sendTextMessage(
  accessToken: string,
  userId: string,
  message: string
): Promise<ZaloApiResponse> {
  const res = await fetch("https://openapi.zalo.me/v3.0/oa/message/cs", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      access_token: accessToken,
    },
    body: JSON.stringify({
      recipient: { user_id: userId },
      message: { text: message },
    }),
  });

  return res.json() as Promise<ZaloApiResponse>;
}

interface ZaloTokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: number;
  message?: string;
}

/**
 * Refresh Zalo OA access token using refresh token.
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<ZaloTokenResponse> {
  const appId = process.env.ZALO_OA_ID;
  const appSecret = process.env.ZALO_OA_SECRET;

  const res = await fetch("https://oauth.zaloapp.com/v4/oa/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      app_id: appId!,
      grant_type: "refresh_token",
      app_secret: appSecret!,
    }),
  });

  return res.json() as Promise<ZaloTokenResponse>;
}

interface ZaloFollowerProfile {
  user_id?: string;
  display_name?: string;
  avatar?: string;
  error?: number;
  message?: string;
  data?: {
    user_id?: string;
    display_name?: string;
    avatar?: string;
  };
}

/**
 * Get profile info of a Zalo OA follower.
 */
export async function getFollowerProfile(
  accessToken: string,
  userId: string
): Promise<ZaloFollowerProfile> {
  const res = await fetch(
    `https://openapi.zalo.me/v2.0/oa/getprofile?data=${encodeURIComponent(JSON.stringify({ user_id: userId }))}`,
    {
      method: "GET",
      headers: { access_token: accessToken },
    }
  );

  return res.json() as Promise<ZaloFollowerProfile>;
}
