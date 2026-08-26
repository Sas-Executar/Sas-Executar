import { Button } from "tamagui";
import type { NativeDoneButtonProps } from "./native-done-button.types";

export type { NativeDoneButtonProps } from "./native-done-button.types";

export function NativeDoneButton({ onPress }: NativeDoneButtonProps) {
  return (
    <Button
      backgroundColor="#D8FF45"
      borderColor="#171714"
      borderRadius={999}
      borderWidth={1}
      color="#171714"
      fontSize={18}
      fontWeight="700"
      height={88}
      onPress={onPress}
      pressStyle={{ backgroundColor: "#C8EE38", scale: 0.97 }}
      width={88}
    >
      Feito
    </Button>
  );
}
