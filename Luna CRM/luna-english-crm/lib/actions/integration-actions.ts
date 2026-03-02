"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Save Zalo OA tokens (access + refresh).
 */
export async function saveZaloTokens(data: {
  accessToken: string;
  refreshToken: string;
  expiresIn?: number;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const expiresAt = data.expiresIn
    ? new Date(Date.now() + data.expiresIn * 1000).toISOString()
    : null;

  const { error } = await supabase.from("integration_tokens").upsert(
    {
      provider: "zalo",
      access_token: data.accessToken,
      refresh_token: data.refreshToken,
      token_expires_at: expiresAt,
      is_active: true,
      created_by: user.id,
    },
    { onConflict: "provider" }
  );

  if (error) return { error: error.message };
  return { success: true };
}

/**
 * Save Facebook page access token.
 */
export async function saveFacebookToken(data: { accessToken: string }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase.from("integration_tokens").upsert(
    {
      provider: "facebook",
      access_token: data.accessToken,
      is_active: true,
      created_by: user.id,
    },
    { onConflict: "provider" }
  );

  if (error) return { error: error.message };
  return { success: true };
}

/**
 * Test Zalo OA connection by checking token validity.
 */
export async function testZaloConnection(): Promise<{
  success?: boolean;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Chưa đăng nhập" };

  const { data: token } = await supabase
    .from("integration_tokens")
    .select("access_token, token_expires_at")
    .eq("provider", "zalo")
    .eq("is_active", true)
    .single();

  if (!token) return { error: "Chưa kết nối Zalo OA" };

  // Check if token is expired
  if (token.token_expires_at) {
    const expiresAt = new Date(token.token_expires_at);
    if (expiresAt < new Date()) {
      return { error: "Token đã hết hạn, cần gia hạn" };
    }
  }

  // Test by calling Zalo API
  try {
    const res = await fetch("https://openapi.zalo.me/v2.0/oa/getoa", {
      headers: { access_token: token.access_token },
    });
    const data = await res.json();
    if (data.error !== 0) {
      return { error: `Zalo API error: ${data.message}` };
    }
    return { success: true };
  } catch {
    return { error: "Không thể kết nối tới Zalo API" };
  }
}

/**
 * Test Facebook connection by validating the token.
 */
export async function testFacebookConnection(): Promise<{
  success?: boolean;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Chưa đăng nhập" };

  const { data: token } = await supabase
    .from("integration_tokens")
    .select("access_token")
    .eq("provider", "facebook")
    .eq("is_active", true)
    .single();

  if (!token) return { error: "Chưa kết nối Facebook" };

  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/me?access_token=${token.access_token}`
    );
    const data = await res.json();
    if (data.error) {
      return { error: `Facebook API error: ${data.error.message}` };
    }
    return { success: true };
  } catch {
    return { error: "Không thể kết nối tới Facebook API" };
  }
}

/**
 * Get webhook events for display in settings.
 */
export async function getWebhookEvents(
  provider?: string,
  limit = 50
): Promise<{
  data?: Array<Record<string, unknown>>;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Chưa đăng nhập" };

  let query = supabase
    .from("webhook_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (provider) {
    query = query.eq("provider", provider);
  }

  const { data, error } = await query;
  if (error) return { error: error.message };
  return { data: data ?? [] };
}

/**
 * Disconnect an integration (deactivate tokens).
 */
export async function disconnectIntegration(
  provider: "zalo" | "facebook"
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("integration_tokens")
    .update({ is_active: false })
    .eq("provider", provider);

  if (error) return { error: error.message };
  return { success: true };
}
