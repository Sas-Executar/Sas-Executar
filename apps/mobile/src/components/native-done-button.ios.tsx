import { Button, Host } from "@expo/ui/swift-ui";
import {
  buttonBorderShape,
  buttonStyle,
  controlSize,
  tint,
} from "@expo/ui/swift-ui/modifiers";
import type { NativeDoneButtonProps } from "./native-done-button.types";

export function NativeDoneButton({ onPress }: NativeDoneButtonProps) {
  return (
    <Host style={{ height: 88, width: 88 }}>
      <Button
        label="Feito"
        modifiers={[
          buttonStyle("borderedProminent"),
          buttonBorderShape("circle"),
          controlSize("large"),
          tint("#D8FF45"),
        ]}
        onPress={onPress}
      />
    </Host>
  );
}
