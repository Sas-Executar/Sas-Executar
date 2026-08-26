import { StyleSheet, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { NativeDoneButton } from "./native-done-button";

interface ExecutionGaugeProps {
  readonly completed: number;
  readonly onDone: () => void;
  readonly total: number;
}

const SIZE = 236;
const CENTER = SIZE / 2;
const RADIUS = 100;
const SEGMENTS = 24;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const SEGMENT_ARC = CIRCUMFERENCE / SEGMENTS;

export function ExecutionGauge({
  completed,
  onDone,
  total,
}: ExecutionGaugeProps) {
  const ratio = total === 0 ? 0 : Math.min(1, completed / total);
  const activeSegments = Math.round(ratio * SEGMENTS);

  return (
    <View accessibilityLabel={`${completed} de ${total} entregas concluídas`}>
      <Svg height={SIZE} width={SIZE}>
        {Array.from({ length: SEGMENTS }, (_, index) => (
          <Circle
            cx={CENTER}
            cy={CENTER}
            fill="transparent"
            key={index}
            r={RADIUS}
            rotation={index * (360 / SEGMENTS) - 90}
            origin={`${CENTER}, ${CENTER}`}
            stroke={index < activeSegments ? "#171714" : "#DEDDD6"}
            strokeDasharray={`${SEGMENT_ARC * 0.56} ${CIRCUMFERENCE - SEGMENT_ARC * 0.56}`}
            strokeLinecap="round"
            strokeWidth={8}
          />
        ))}
      </Svg>
      <View style={styles.centerButton}>
        <NativeDoneButton onPress={onDone} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centerButton: {
    alignItems: "center",
    bottom: 0,
    justifyContent: "center",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
});
