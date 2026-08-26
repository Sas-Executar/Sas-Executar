import { useAuth, useClerk } from "@clerk/expo";
import { useHostedAuth } from "@clerk/expo/hosted-auth";
import type { ProjecaoEstadoMobile } from "@repo/executar-contracts/mobile";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useState,
} from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Card, H1, Paragraph, Spinner, YStack } from "tamagui";
import { ExecutionScreen } from "@/features/execution/execution-screen";
import { requirePublicMobileConfig } from "@/lib/config";
import { carregarEstadoMobile } from "@/lib/executar-client";

function CenteredCard({
  action,
  body,
  title,
}: {
  readonly action?: ReactNode;
  readonly body: string;
  readonly title: string;
}) {
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
          <H1 style={{ color: "#171714", fontSize: 32, lineHeight: 36 }}>
            {title}
          </H1>
          <Paragraph style={{ color: "#73736D", fontSize: 16 }}>
            {body}
          </Paragraph>
          {action}
        </Card>
      </YStack>
    </SafeAreaView>
  );
}

export function AuthGate() {
  const { getToken, isLoaded, isSignedIn, orgId } = useAuth();
  const { signOut } = useClerk();
  const { startHostedAuth } = useHostedAuth();
  const [projection, setProjection] = useState<ProjecaoEstadoMobile | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const { apiUrl } = requirePublicMobileConfig();

  const refresh = useCallback(async () => {
    if (!(isSignedIn && orgId)) {
      return;
    }

    setRefreshing(true);
    setError(null);

    try {
      const token = await getToken();

      if (!token) {
        throw new Error("A sessão Clerk não forneceu um token nativo.");
      }

      setProjection(await carregarEstadoMobile({ apiUrl, token }));
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível carregar o estado canônico."
      );
    } finally {
      setRefreshing(false);
    }
  }, [apiUrl, getToken, isSignedIn, orgId]);

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  if (!isLoaded) {
    return (
      <CenteredCard
        action={<Spinner color="#171714" size="large" />}
        body="Validando a sessão segura do dispositivo."
        title="EXECUTAR"
      />
    );
  }

  if (!isSignedIn) {
    return (
      <CenteredCard
        action={
          <Button
            color="#FFFFFF"
            onPress={() => startHostedAuth()}
            style={{ backgroundColor: "#171714", borderRadius: 999 }}
          >
            Entrar com Clerk
          </Button>
        }
        body="Use a mesma identidade e organização do SaaS atual. Nenhum cadastro paralelo é criado no aplicativo."
        title="Seu próximo resultado começa aqui."
      />
    );
  }

  if (!orgId) {
    return (
      <CenteredCard
        action={
          <Button
            color="#FFFFFF"
            onPress={() => signOut()}
            style={{ backgroundColor: "#171714", borderRadius: 999 }}
          >
            Trocar sessão
          </Button>
        }
        body="Selecione uma organização Clerk ativa antes de acessar o estado operacional."
        title="Organização necessária"
      />
    );
  }

  if (error && !projection) {
    return (
      <CenteredCard
        action={
          <Button
            color="#171714"
            onPress={() => refresh()}
            style={{ backgroundColor: "#D8FF45", borderRadius: 999 }}
          >
            Tentar novamente
          </Button>
        }
        body={error}
        title="Sincronização indisponível"
      />
    );
  }

  if (!projection) {
    return (
      <CenteredCard
        action={<Spinner color="#171714" size="large" />}
        body="Lendo foco, fila e calendário do backend canônico."
        title="Preparando execução"
      />
    );
  }

  return (
    <ExecutionScreen
      onRefresh={refresh}
      onSignOut={() => signOut()}
      projection={projection}
      refreshing={refreshing}
    />
  );
}
