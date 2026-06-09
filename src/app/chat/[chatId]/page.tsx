// src/app/chat/[chatId]/page.tsx
import { ChatApp } from "@/components/ChatApp";

export default async function ChatPage({ params }: { params: Promise<{ chatId: string }> }) {
  const { chatId } = await params;
  return <ChatApp initialChatId={chatId} />;
}
