"use client";

import { useState, useEffect, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ZaloConnectionCard } from "@/components/settings/zalo-connection-card";
import { FacebookConnectionCard } from "@/components/settings/facebook-connection-card";
import { WebhookStatusCard } from "@/components/settings/webhook-status-card";
import { WebhookEventsTable } from "@/components/settings/webhook-events-table";
import { getWebhookEvents } from "@/lib/actions/integration-actions";

interface ConnectionInfo {
  connected: boolean;
  expiresAt: string | null;
  updatedAt: string;
}

interface IntegrationSettingsProps {
  connections: Record<string, ConnectionInfo>;
}

export function IntegrationSettings({
  connections,
}: IntegrationSettingsProps) {
  const [events, setEvents] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    const result = await getWebhookEvents(undefined, 100);
    if (result.data) setEvents(result.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount
    loadEvents();
  }, [loadEvents]);

  const zaloEvents = events.filter((e) => e.provider === "zalo");
  const fbEvents = events.filter((e) => e.provider === "facebook");

  return (
    <Tabs defaultValue="connections" className="space-y-6">
      <TabsList>
        <TabsTrigger value="connections">Kết nối</TabsTrigger>
        <TabsTrigger value="webhooks">Webhook Events</TabsTrigger>
      </TabsList>

      <TabsContent value="connections" className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <ZaloConnectionCard
            connection={connections.zalo ?? null}
            onRefresh={loadEvents}
          />
          <FacebookConnectionCard
            connection={connections.facebook ?? null}
            onRefresh={loadEvents}
          />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <WebhookStatusCard provider="zalo" events={zaloEvents} />
          <WebhookStatusCard provider="facebook" events={fbEvents} />
        </div>
      </TabsContent>

      <TabsContent value="webhooks">
        <WebhookEventsTable events={events} loading={loading} />
      </TabsContent>
    </Tabs>
  );
}
