"use client";

import { useEffect, useState } from "react";
import { ChatRoom } from "@/components/chat/chat-room";
import type { PortalFeatures } from "@/lib/features-shared";

type ClientOption = { id: string; name: string; company: string; email: string; phone: string };

/** CMS → Messages: the same chat room clients use, with every conversation, internal notes and assignment. */
export function StaffMessages({ me, features, conversationId }: { me: { id: string; name: string }; features: PortalFeatures; conversationId?: string }) {
  const [clients, setClients] = useState<ClientOption[]>([]);
  useEffect(() => {
    fetch("/api/admin/clients", { cache: "no-store" }).then((response) => response.json()).then((data: { clients?: ClientOption[] }) => setClients(data.clients || [])).catch(() => undefined);
  }, []);
  return (
    <ChatRoom
      side="staff"
      me={me}
      features={features}
      initialId={conversationId}
      basePath="/admin/messages"
      apiBase="/api/admin/portal"
      clients={clients}
      links={{ quoteBase: "/admin/quotes?quote=", progress: "/admin/progress" }}
    />
  );
}
