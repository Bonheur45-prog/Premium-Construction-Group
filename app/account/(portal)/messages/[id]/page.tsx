import { MessagesScreen } from "@/components/portal/screens/messages";

export const metadata = { title: "Messages" };

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MessagesScreen id={id} />;
}
