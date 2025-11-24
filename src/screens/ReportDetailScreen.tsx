// src/screens/ReportDetailScreen.tsx
import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { RouteProp, useRoute } from "@react-navigation/native";
import { StatusPill } from "../components/StatusPill";
import { firestoreTimestampToDate, formatTimeAgo } from "../utils/time";
import { AudioReport } from "../types";

type Params = {
  ReportDetail: {
    report: AudioReport;
  };
};

const ReportDetailScreen: React.FC = () => {
  const route = useRoute<RouteProp<Params, "ReportDetail">>();
  const { report } = route.params;
  const createdDate = firestoreTimestampToDate(report.createdAt);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <StatusPill prediction={report.prediction} />
        <Text style={styles.prediction}>{report.prediction}</Text>

        <Text style={styles.muted}>
          Confianza {(report.probability * 100).toFixed(1)}%
        </Text>

        <Text style={styles.mutedSmall}>
          Creado: {createdDate?.toLocaleString() ?? "sin fecha"} (
          {formatTimeAgo(createdDate)})
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Origen</Text>
        <Text style={styles.value}>{report.source}</Text>

        <Text style={styles.label}>Estado</Text>
        <Text style={styles.value}>{report.status}</Text>

        <Text style={styles.label}>Ruta del audio</Text>
        <Text style={styles.valueSmall}>{report.audioPath}</Text>
      </View>
    </ScrollView>
  );
};

export default ReportDetailScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#020617",
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: "#0f172a",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  prediction: {
    color: "#e5e7eb",
    fontSize: 22,
    fontWeight: "700",
    marginTop: 8,
    marginBottom: 4,
  },
  muted: {
    color: "#9ca3af",
    fontSize: 14,
  },
  mutedSmall: {
    color: "#6b7280",
    fontSize: 12,
    marginTop: 4,
  },
  label: {
    color: "#9ca3af",
    fontSize: 13,
    marginTop: 8,
  },
  value: {
    color: "#e5e7eb",
    fontSize: 15,
  },
  valueSmall: {
    color: "#e5e7eb",
    fontSize: 13,
    marginTop: 2,
  },
});
