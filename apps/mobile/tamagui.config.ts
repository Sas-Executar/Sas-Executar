import { defaultConfig } from "@tamagui/config/v5";
import { createTamagui } from "tamagui";

const config = createTamagui(defaultConfig);

export type ExecutarTamaguiConfig = typeof config;

declare module "tamagui" {
  interface TamaguiCustomConfig extends ExecutarTamaguiConfig {}
}

export default config;
