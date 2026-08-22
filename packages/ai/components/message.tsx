import type { UIMessage } from "ai";
import type { ComponentProps } from "react";
import { Streamdown } from "streamdown";
import { twMerge } from "tailwind-merge";

interface MessageProps {
  data: UIMessage;
  markdown?: ComponentProps<typeof Streamdown>;
}

export const Message = ({ data, markdown }: MessageProps) => (
  <div
    className={twMerge(
      "flex max-w-[80%] flex-col gap-2 rounded-xl px-4 py-2",
      data.role === "user"
        ? "self-end bg-foreground text-background"
        : "self-start bg-muted"
    )}
  >
    <Streamdown {...markdown}>
      {data.parts
        .filter((part) => part.type === "text")
        .map((part) => part.text)
        .join("\n")}
    </Streamdown>
  </div>
);
