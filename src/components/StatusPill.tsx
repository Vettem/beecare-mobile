// src/components/StatusPill.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";

type Props = {
  prediction: string;
};

export const StatusPill: React.FC<Props> = ({ prediction }) => {
  const normalized = prediction.toLowerCase();

  let bg = "#16a34a";
  let label = "Colmena sana";

  if (normalized.includes("reina")) {
    bg = "#dc2626";
    label = "Posible reina ausente";
  }

  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  text: {
    color: "white",
    fontWeight: "600",
    fontSize: 12,
  },
});