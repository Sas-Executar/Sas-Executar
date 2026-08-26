import { SafeAreaView } from "react-native-safe-area-context";
import { Card, H1, Paragraph, SizableText, YStack } from "tamagui";

interface ConfigurationScreenProps {
  readonly details: readonly string[];
}

export function ConfigurationScreen({ details }: ConfigurationScreenProps) {
  return (
    <SafeAreaView style={{ backgroundColor: "#F2F1ED", flex: 1 }}>
      <YStack flex={1} justifyContent="center" padding="$5">
        <Card
          backgroundColor="#FFFFFF"
          borderColor="#DEDDD6"
          borderRadius={28}
          borderWidth={1}
          gap="$4"
          padding="$5"
        >
          <SizableText color="#73736D" fontSize={12} letterSpacing={1.5}>
            CONFIGURAÇÃO LOCAL
          </SizableText>
          <H1 color="#171714" fontSize={32} lineHeight={36}>
            Conecte o ambiente mobile.
          </H1>
          <Paragraph color="#73736D" size="$4">
            Copie .env.example para .env.local e informe somente valores públicos.
          </Paragraph>
          <YStack
            backgroundColor="#F2F1ED"
            borderColor="#DEDDD6"
            borderRadius={18}
            borderWidth={1}
            gap="$2"
            padding="$4"
          >
            {details.map((detail) => (
              <SizableText color="#171714" fontFamily="$mono" key={detail}>
                {detail}
              </SizableText>
            ))}
          </YStack>
        </Card>
      </YStack>
    </SafeAreaView>
  );
}
