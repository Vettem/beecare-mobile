// src/screens/HistoryScreen.tsx
import React from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useHiveReports } from "../hooks/useHiveReports";
import { ReportCard } from "../components/ReportCard";
import { AudioReport } from "../types";

const HistoryScreen: React.FC = () => {
  const { reports, loading } = useHiveReports();
  const navigation = useNavigation<any>();

  const renderItem = ({ item }: { item: AudioReport }) => (
    <ReportCard
      report={item}
      onPress={() => navigation.navigate("ReportDetail", { report: item })}
    />
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Historial de análisis</Text>

        {loading && <Text style={styles.muted}>Cargando...</Text>}

        {!loading && !reports.length && (
          <Text style={styles.muted}>No hay reportes todavía.</Text>
        )}

        <FlatList
          data={reports}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      </View>
    </SafeAreaView>
  );
};

export default HistoryScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#020617",
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  title: {
    color: "white",
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 12,
  },
  muted: {
    color: "#9ca3af",
    fontSize: 14,
    marginBottom: 8,
  },
});