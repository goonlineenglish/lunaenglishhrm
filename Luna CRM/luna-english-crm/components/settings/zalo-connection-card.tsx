"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  saveZaloTokens,
  testZaloConnection,
  disconnectIntegration,
} from "@/lib/actions/integration-actions";

interface ConnectionInfo {
  connected: boolean;
  expiresAt: string | null;
  updatedAt: string;
}

interface ZaloConnectionCardProps {
  connection: ConnectionInfo | null;
  onRefresh: () => void;
}

export function ZaloConnectionCard({
  connection,
  onRefresh,
}: ZaloConnectionCardProps) {
  const [accessToken, setAccessToken] = useState("");
  const [refreshToken, setRefreshToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  async function handleConnect() {
    if (!accessToken || !refreshToken) {
      toast.error("Vui lòng nhập cả Access Token và Refresh Token");
      return;
    }
    setSaving(true);
    const result = await saveZaloTokens({
      accessToken,
      refreshToken,
      expiresIn: 86400,
    });
    setSaving(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Đã kết nối Zalo OA thành công");
      setAccessToken("");
      setRefreshToken("");
      onRefresh();
    }
  }

  async function handleTest() {
    setTesting(true);
    const result = await testZaloConnection();
    setTesting(false);

    if (result.success) {
      toast.success("Kết nối Zalo OA hoạt động tốt");
    } else {
      toast.error(result.error ?? "Kiểm tra thất bại");
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    const result = await disconnectIntegration("zalo");
    setDisconnecting(false);

    if (result.success) {
      toast.success("Đã ngắt kết nối Zalo OA");
      onRefresh();
    } else {
      toast.error(result.error ?? "Ngắt kết nối thất bại");
    }
  }

  const isConnected = connection?.connected ?? false;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Zalo OA</CardTitle>
          <Badge variant={isConnected ? "default" : "secondary"}>
            {isConnected ? "Đã kết nối" : "Chưa kết nối"}
          </Badge>
        </div>
        <CardDescription>
          Kết nối Zalo Official Account để nhận tin nhắn và gửi thông báo
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isConnected ? (
          <div className="space-y-3">
            {connection?.expiresAt && (
              <p className="text-sm text-muted-foreground">
                Token hết hạn:{" "}
                {new Date(connection.expiresAt).toLocaleString("vi-VN")}
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              Cập nhật lần cuối:{" "}
              {connection?.updatedAt
                ? new Date(connection.updatedAt).toLocaleString("vi-VN")
                : "N/A"}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleTest}
                disabled={testing}
              >
                {testing ? "Đang kiểm tra..." : "Kiểm tra kết nối"}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDisconnect}
                disabled={disconnecting}
              >
                {disconnecting ? "Đang ngắt..." : "Ngắt kết nối"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <Label htmlFor="zalo-access-token">Access Token</Label>
              <Input
                id="zalo-access-token"
                type="password"
                placeholder="Nhập Access Token từ Zalo OA"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="zalo-refresh-token">Refresh Token</Label>
              <Input
                id="zalo-refresh-token"
                type="password"
                placeholder="Nhập Refresh Token từ Zalo OA"
                value={refreshToken}
                onChange={(e) => setRefreshToken(e.target.value)}
              />
            </div>
            <Button onClick={handleConnect} disabled={saving}>
              {saving ? "Đang kết nối..." : "Kết nối Zalo OA"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
