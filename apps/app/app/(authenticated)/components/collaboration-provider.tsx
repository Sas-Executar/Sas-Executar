"use client";

import { Room } from "@repo/collaboration/room";
import type { ReactNode } from "react";
import { getUsers } from "@/app/actions/users/get";
import { searchUsers } from "@/app/actions/users/search";

export const CollaborationProvider = ({
  orgId,
  projectId,
  children,
}: {
  orgId: string;
  projectId: string;
  children: ReactNode;
}) => {
  const resolveUsers = async ({ userIds }: { userIds: string[] }) => {
    const response = await getUsers(userIds);

    if ("error" in response) {
      throw new Error("Problem resolving users");
    }

    return response.data;
  };

  const resolveMentionSuggestions = async ({ text }: { text: string }) => {
    const response = await searchUsers(text);

    if ("error" in response) {
      throw new Error("Problem resolving mention suggestions");
    }

    return response.data;
  };

  return (
    <Room
      authEndpoint="/api/collaboration/auth"
      fallback={
        <div className="px-3 text-muted-foreground text-xs">Carregando colaboração...</div>
      }
      id={`${orgId}:${projectId}`}
      resolveMentionSuggestions={resolveMentionSuggestions}
      resolveUsers={resolveUsers}
    >
      {children}
    </Room>
  );
};

