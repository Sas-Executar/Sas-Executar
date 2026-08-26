import { Button, XStack } from "tamagui";
import type { ScopeSelectorProps } from "./scope-selector.types";

export type { ScopeOption, ScopeSelectorProps } from "./scope-selector.types";

export function ScopeSelector({
  onSelectionChange,
  options,
  selection,
}: ScopeSelectorProps) {
  return (
    <XStack style={{ flexWrap: "wrap", gap: 8 }}>
      {options.map((option) => (
        <Button
          color={option.id === selection ? "#FFFFFF" : "#171714"}
          key={option.id}
          onPress={() => onSelectionChange(option.id)}
          style={{
            backgroundColor: option.id === selection ? "#171714" : "#FFFFFF",
            borderColor: "#DEDDD6",
            borderRadius: 999,
            borderWidth: 1,
          }}
        >
          {option.label}
        </Button>
      ))}
    </XStack>
  );
}
