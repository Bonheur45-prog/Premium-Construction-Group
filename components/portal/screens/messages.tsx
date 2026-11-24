import { notFound, redirect } from "next/navigation";
import { ChatRoom } from "@/components/chat/chat-room";
import { getCurrentClient } from "@/lib/clients/session";
import { getFeatures } from "@/lib/features";
import { portalFeatures } from "@/lib/features-shared";

/** The client's chat room. Used by /account/messages and /account/messages/<id> (links in emails and alerts). */
export async function MessagesScreen({ id }: { id?: string }) {
  const client = await getCurrentClient();
  if (!client) redirect("/account/login?next=/account/messages");
  const features = await getFeatures();
  if (!features.chat.enabled) notFound();
  if (!client.verified) {
    return (
      <div className="ps-page">
        <div className="portal-callout"><strong>Confirm your email to start messaging.</strong><p>We sent you a link when you signed up. Open it, then come back here. You can ask for a new link on the Overview page.</p></div>
      </div>
    );
  }
  return (
    <ChatRoom
      side="client"
      me={{ id: client.id, name: client.name }}
      features={portalFeatures(features)}
      initialId={id}
      basePath="/account/messages"
      apiBase="/api/portal"
      links={{ quoteBase: "/account/quotes", progress: "/account/projects" }}
    />
  );
}
