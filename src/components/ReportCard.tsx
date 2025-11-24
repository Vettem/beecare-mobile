// src/components/ReportCard.tsx
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { AudioReport } from "../types";
import { StatusPill } from "./StatusPill";
import { firestoreTimestampToDate, formatTimeAgo } from "../utils/time";

type Props = {
  report: AudioReport;
  onPress?: () => void;
};

export const ReportCard: React.FC<Props> = ({ report, onPress }) => {
  const createdDate = firestoreTimestampToDate(report.createdAt);
  const timeAgo = formatTimeAgo(createdDate);

  const content = (
    <View style={styles.card}>
      <View style={styles.rowTop}>
        <StatusPill prediction={report.prediction} />
        <Text style={styles.time}>{timeAgo}</Text>
      </View>

      <Text style={styles.prob}>
        Confianza: {(report.probability * 100).toFixed(1)}%
      </Text>

      <Text style={styles.meta}>
        Origen: {report.source} · Estado: {report.status}
      </Text>

      <Text style={styles.path} numberOfLines={1}>
        {report.audioPath}
      </Text>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#111827",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  time: {
    color: "#9ca3af",
    fontSize: 12,
  },
  prob: {
    color: "#e5e7eb",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  meta: {
    color: "#9ca3af",
    fontSize: 12,
  },
  path: {
    color: "#6b7280",
    fontSize: 11,
    marginTop: 6,
  },
});
