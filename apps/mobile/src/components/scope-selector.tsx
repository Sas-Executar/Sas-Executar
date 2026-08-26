import { Button, XStack } from "tamagui";
import type { ScopeSelectorProps } from "./scope-selector.types";

export type { ScopeOption, ScopeSelectorProps } from "./scope-selector.types";

export function ScopeSelector({
  onSelectionChange,
  options,
  selection,
}: ScopeSelectorProps) {
  return (
    <XStack flexWrap="wrap" gap="$2">
      {options.map((option) => (
        <Button
          backgroundColor={
            option.id === selection ? "#171714" : "#FFFFFF"
          }
          borderColor="#DEDDD6"
          borderRadius="$10"
          borderWidth={1}
          color={option.id === selection ? "#FFFFFF" : "#171714"}
          key={option.id}
          onPress={() => onSelectionChange(option.id)}
          size="$3"
        >
          {option.label}
        </Button>
      ))}
    </XStack>
  );
}
