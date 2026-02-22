"use client";

import { setActiveDomain } from "@/lib/dellma/active-domain";
import { createDellmaStore } from "@/lib/dellma/store";
import { travelConfig } from "@/domains/travel/config";
import { ChatContainer } from "@/components/chat-container";

// Initialize the domain and store at module level (runs once)
setActiveDomain(travelConfig);
createDellmaStore(travelConfig);

export default function Home() {
  return <ChatContainer />;
}
