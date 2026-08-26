import { Host, Picker, Text } from "@expo/ui/swift-ui";
import { pickerStyle, tag } from "@expo/ui/swift-ui/modifiers";
import type { ScopeSelectorProps } from "./scope-selector.types";

export function ScopeSelector({
  onSelectionChange,
  options,
  selection,
}: ScopeSelectorProps) {
  return (
    <Host style={{ height: 44, width: 168 }}>
      <Picker
        label="Escopo"
        modifiers={[pickerStyle("menu")]}
        onSelectionChange={onSelectionChange}
        selection={selection}
      >
        {options.map((option) => (
          <Text key={option.id} modifiers={[tag(option.id)]}>
            {option.label}
          </Text>
        ))}
      </Picker>
    </Host>
  );
}
