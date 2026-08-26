import "react-native-gesture-handler";

import { ClerkProvider } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { TamaguiProvider } from "tamagui";
import tamaguiConfig from "../../tamagui.config";
import { ConfigurationScreen } from "@/features/configuration/configuration-screen";
import { readPublicMobileConfig } from "@/lib/config";

export default function RootLayout() {
  let result: ReturnType<typeof readPublicMobileConfig>;

  try {
    result = readPublicMobileConfig();
  } catch (error) {
    result = {
      configured: false,
      missing: [
        error instanceof Error ? error.message : "Configuração pública inválida.",
      ],
    };
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <TamaguiProvider config={tamaguiConfig} defaultTheme="light">
        <StatusBar style="dark" />
        {result.configured ? (
          <ClerkProvider
            publishableKey={result.value.clerkPublishableKey}
            tokenCache={tokenCache}
          >
            <Stack screenOptions={{ headerShown: false }} />
          </ClerkProvider>
        ) : (
          <ConfigurationScreen details={result.missing} />
        )}
      </TamaguiProvider>
    </GestureHandlerRootView>
  );
}
