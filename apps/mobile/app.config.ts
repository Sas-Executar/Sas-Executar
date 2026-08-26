import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "EXECUTAR",
  slug: "executar-mobile",
  scheme: "executar",
  version: "0.1.0",
  orientation: "portrait",
  userInterfaceStyle: "light",
  backgroundColor: "#F2F1ED",
  plugins: [
    "expo-router",
    [
      "expo-secure-store",
      {
        configureAndroidBackup: true,
        faceIDPermission:
          "Permita que o EXECUTAR use o Face ID para proteger sua sessão.",
      },
    ],
    "@clerk/expo",
  ],
  experiments: {
    typedRoutes: true,
  },
  ios: {
    bundleIdentifier:
      process.env.EXECUTAR_IOS_BUNDLE_IDENTIFIER ?? "com.sasexecutar.executar",
    supportsTablet: false,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: process.env.EXECUTAR_ANDROID_PACKAGE ?? "com.sasexecutar.executar",
  },
};

export default config;
