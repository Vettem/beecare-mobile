// src/screens/HomeScreen.tsx
import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useHiveReports } from "../hooks/useHiveReports";
import { StatusPill } from "../components/StatusPill";
import { ReportCard } from "../components/ReportCard";
import { firestoreTimestampToDate, formatTimeAgo } from "../utils/time";

const HomeScreen: React.FC = () => {
  const { reports, loading } = useHiveReports();
  const last = reports[0];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Colmena 1</Text>

        {/* Tarjeta grande de estado actual */}
        <View style={styles.statusCard}>
          <Text style={styles.sectionLabel}>Estado actual</Text>

          {loading && <Text style={styles.muted}>Cargando...</Text>}

          {!loading && !last && (
            <Text style={styles.muted}>
              Aún no hay reportes. Cuando tu dispositivo envíe el primer audio,
              aparecerá aquí.
            </Text>
          )}

          {!loading && last && (
            <>
              <StatusPill prediction={last.prediction} />
              <Text style={styles.statusMain}>{last.prediction}</Text>

              <Text style={styles.muted}>
                Confianza {(last.probability * 100).toFixed(1)}%
              </Text>

              <Text style={styles.mutedSmall}>
                Último análisis{" "}
                {formatTimeAgo(firestoreTimestampToDate(last.createdAt))}
              </Text>
            </>
          )}
        </View>

        {/* Resumen de historial */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Últimos reportes</Text>

          {!reports.length && !loading && (
            <Text style={styles.muted}>Todavía no hay historial.</Text>
          )}

          {reports.slice(0, 5).map((r) => (
            <ReportCard key={r.id} report={r} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#020617",
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  title: {
    color: "white",
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 12,
  },
  statusCard: {
    backgroundColor: "#0f172a",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  section: {
    marginTop: 4,
  },
  sectionLabel: {
    color: "#9ca3af",
    fontSize: 13,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  statusMain: {
    color: "#e5e7eb",
    fontSize: 20,
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
});
