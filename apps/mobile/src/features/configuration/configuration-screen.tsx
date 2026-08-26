import { SafeAreaView } from "react-native-safe-area-context";
import { Card, H1, Paragraph, SizableText, YStack } from "tamagui";

interface ConfigurationScreenProps {
  readonly details: readonly string[];
}

export function ConfigurationScreen({ details }: ConfigurationScreenProps) {
  return (
    <SafeAreaView style={{ backgroundColor: "#F2F1ED", flex: 1 }}>
      <YStack style={{ flex: 1, justifyContent: "center", padding: 20 }}>
        <Card
          style={{
            backgroundColor: "#FFFFFF",
            borderColor: "#DEDDD6",
            borderRadius: 28,
            borderWidth: 1,
            gap: 16,
            padding: 20,
          }}
        >
          <SizableText
            style={{ color: "#73736D", fontSize: 12, letterSpacing: 1.5 }}
          >
            CONFIGURAÇÃO LOCAL
          </SizableText>
          <H1 style={{ color: "#171714", fontSize: 32, lineHeight: 36 }}>
            Conecte o ambiente mobile.
          </H1>
          <Paragraph style={{ color: "#73736D", fontSize: 16 }}>
            Copie .env.example para .env.local e informe somente valores
            públicos.
          </Paragraph>
          <YStack
            style={{
              backgroundColor: "#F2F1ED",
              borderColor: "#DEDDD6",
              borderRadius: 18,
              borderWidth: 1,
              gap: 8,
              padding: 16,
            }}
          >
            {details.map((detail) => (
              <SizableText key={detail} style={{ color: "#171714" }}>
                {detail}
              </SizableText>
            ))}
          </YStack>
        </Card>
      </YStack>
    </SafeAreaView>
  );
}
