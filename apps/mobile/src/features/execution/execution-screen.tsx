import type {
  EntregaMobile,
  ProjecaoEstadoMobile,
} from "@repo/executar-contracts/mobile";
import { useMemo, useState } from "react";
import { Alert, RefreshControl, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Button,
  Card,
  H1,
  Paragraph,
  SizableText,
  XStack,
  YStack,
} from "tamagui";
import { ExecutionGauge } from "@/components/execution-gauge";
import { type ScopeOption, ScopeSelector } from "@/components/scope-selector";

interface ExecutionScreenProps {
  readonly onRefresh: () => Promise<void>;
  readonly onSignOut: () => void;
  readonly projection: ProjecaoEstadoMobile;
  readonly refreshing: boolean;
}

const SCOPE_OPTIONS: readonly ScopeOption[] = [
  { id: "day", label: "Hoje" },
  { id: "workflow", label: "Fluxo" },
  { id: "cycle", label: "Ciclo 72h" },
  { id: "week", label: "Semana" },
];

const AREA_LABELS = ["Foco", "Em seguida", "Depois"] as const;

function taskAreas(
  projection: ProjecaoEstadoMobile
): readonly (EntregaMobile | null)[] {
  const unique = new Map<string, EntregaMobile>();

  if (projection.focus) {
    unique.set(projection.focus.id, projection.focus);
  }

  for (const task of projection.ready) {
    unique.set(task.id, task);
  }

  const tasks = [...unique.values()].slice(0, 3);

  return Array.from({ length: 3 }, (_, index) => tasks[index] ?? null);
}

function QueueCard({
  label,
  task,
}: {
  readonly label: string;
  readonly task: EntregaMobile | null;
}) {
  return (
    <Card
      onPress={() => {
        if (task) {
          Alert.alert(
            task.title,
            task.dod ?? "Sem critério de conclusão informado."
          );
        }
      }}
      pressStyle={task ? { scale: 0.99 } : undefined}
      style={{
        backgroundColor: "#FFFFFF",
        borderColor: "#DEDDD6",
        borderRadius: 24,
        borderWidth: 1,
        padding: 16,
      }}
    >
      <XStack style={{ alignItems: "center", justifyContent: "space-between" }}>
        <SizableText
          style={{ color: "#73736D", fontSize: 11, letterSpacing: 1.2 }}
        >
          {label.toLocaleUpperCase("pt-BR")}
        </SizableText>
        {task ? (
          <SizableText style={{ color: "#73736D", fontSize: 12 }}>
            {task.mins} min · {task.date}
          </SizableText>
        ) : null}
      </XStack>
      <SizableText
        style={{
          color: task ? "#171714" : "#9B9A94",
          fontSize: 18,
          fontWeight: "600",
          marginTop: 12,
        }}
      >
        {task?.title ?? "Fila livre"}
      </SizableText>
      <Paragraph style={{ color: "#73736D", fontSize: 14, marginTop: 8 }}>
        {task
          ? `${task.front} · etapa ${task.stage}`
          : "Nenhuma entrega pronta nesta posição."}
      </Paragraph>
    </Card>
  );
}

export function ExecutionScreen({
  onRefresh,
  onSignOut,
  projection,
  refreshing,
}: ExecutionScreenProps) {
  const [scope, setScope] = useState("day");
  const areas = useMemo(() => taskAreas(projection), [projection]);
  const totals = useMemo(
    () => ({
      completed: projection.calendar.reduce(
        (count, day) => count + day.completedCount,
        0
      ),
      total: projection.calendar.reduce(
        (count, day) => count + day.tasks.length,
        0
      ),
    }),
    [projection.calendar]
  );

  const protectCompletion = () => {
    Alert.alert(
      "Conclusão protegida",
      "O estado canônico só será alterado pelo fluxo móvel quando evidência verificada e aprovação humana estiverem integradas."
    );
  };

  return (
    <SafeAreaView style={{ backgroundColor: "#F2F1ED", flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 48 }}
        refreshControl={
          <RefreshControl
            onRefresh={onRefresh}
            refreshing={refreshing}
            tintColor="#171714"
          />
        }
      >
        <YStack style={{ gap: 20 }}>
          <XStack
            style={{ alignItems: "center", justifyContent: "space-between" }}
          >
            <ScopeSelector
              onSelectionChange={setScope}
              options={SCOPE_OPTIONS}
              selection={scope}
            />
            <Button chromeless color="#73736D" onPress={onSignOut}>
              Sair
            </Button>
          </XStack>

          <YStack style={{ gap: 8 }}>
            <SizableText
              style={{ color: "#73736D", fontSize: 12, letterSpacing: 1.5 }}
            >
              EXECUTAR · REVISÃO {projection.revision}
            </SizableText>
            <H1 style={{ color: "#171714", fontSize: 34, lineHeight: 38 }}>
              {projection.projectName}
            </H1>
            <Paragraph style={{ color: "#73736D", fontSize: 16 }}>
              Próximo resultado, uma ação por vez.
            </Paragraph>
          </YStack>

          <YStack
            style={{ alignItems: "center", gap: 12, paddingVertical: 12 }}
          >
            <ExecutionGauge
              completed={totals.completed}
              onDone={protectCompletion}
              total={totals.total}
            />
            <SizableText style={{ color: "#73736D", fontSize: 13 }}>
              {totals.completed}/{totals.total} resultados concluídos
            </SizableText>
          </YStack>

          <YStack style={{ gap: 12 }}>
            {areas.map((task, index) => (
              <QueueCard
                key={task?.id ?? AREA_LABELS[index]}
                label={AREA_LABELS[index]}
                task={task}
              />
            ))}
          </YStack>

          <Card
            style={{
              backgroundColor: "#E8E7E1",
              borderColor: "#DEDDD6",
              borderRadius: 18,
              borderWidth: 1,
              padding: 16,
            }}
          >
            <SizableText
              style={{ color: "#171714", fontSize: 13, fontWeight: "600" }}
            >
              Estado canônico protegido
            </SizableText>
            <Paragraph style={{ color: "#73736D", fontSize: 12, marginTop: 8 }}>
              Esta fundação lê foco, fila, calendário e metadados de evidência
              do backend atual. Escritas móveis continuam bloqueadas pelo Gate
              Mobile.
            </Paragraph>
          </Card>
        </YStack>
      </ScrollView>
    </SafeAreaView>
  );
}
