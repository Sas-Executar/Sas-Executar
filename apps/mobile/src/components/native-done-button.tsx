import { Button } from "tamagui";
import type { NativeDoneButtonProps } from "./native-done-button.types";

export type { NativeDoneButtonProps } from "./native-done-button.types";

export function NativeDoneButton({ onPress }: NativeDoneButtonProps) {
  return (
    <Button
      color="#171714"
      onPress={onPress}
      pressStyle={{ opacity: 0.8, scale: 0.97 }}
      style={{
        backgroundColor: "#D8FF45",
        borderColor: "#171714",
        borderRadius: 999,
        borderWidth: 1,
        height: 88,
        width: 88,
      }}
    >
      Feito
    </Button>
  );
}
