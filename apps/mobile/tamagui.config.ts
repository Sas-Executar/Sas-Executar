import { defaultConfig } from "@tamagui/config/v5";
import { createTamagui } from "tamagui";

const config = createTamagui({
  ...defaultConfig,
  tokens: {
    ...defaultConfig.tokens,
    color: {
      ...defaultConfig.tokens.color,
      executarCanvas: "#F2F1ED",
      executarCard: "#FFFFFF",
      executarInk: "#171714",
      executarMuted: "#73736D",
      executarLine: "#DEDDD6",
      executarSignal: "#D8FF45",
    },
  },
});

export type ExecutarTamaguiConfig = typeof config;

declare module "tamagui" {
  interface TamaguiCustomConfig extends ExecutarTamaguiConfig {}
}

export default config;
