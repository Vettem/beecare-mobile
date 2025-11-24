// App.tsx
import "react-native-gesture-handler";
import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import { colors, beePalette } from "./src/theme";

// Firebase
import {
  db,
  collection,
  query,
  orderBy,
  onSnapshot,
  auth,
} from "./src/firebase";
import { onAuthStateChanged, User, signOut } from "firebase/auth";

// Pantalla de login/registro
import AuthScreen from "./src/AuthScreen";

// ============================
// Tipos y helpers compartidos
// ============================

type AudioReport = {
  id: string;
  audioPath: string;
  prediction: string;
  probability: number;
  source: string;
  status: string;
  createdAt?: any; // Firestore Timestamp u otro
};

// Por ahora seguimos usando colmena fija;
// luego podemos mostrar un selector de colmenas
const FIXED_HIVE_ID = "colmena1";

// Traducción “bonita” para mostrar
const PREDICTION_LABELS: Record<string, string> = {
  sana: "Colmena sana",
  reina_ausente: "Reina ausente",
};

// Colores por estado
const PREDICTION_COLORS: Record<string, string> = {
  sana: colors.healthy,
  reina_ausente: colors.danger,
};

function timestampToDate(ts: any): Date | null {
  if (!ts) return null;
  if (ts.toDate) return ts.toDate(); // Firestore Timestamp
  if (ts instanceof Date) return ts;
  return new Date(ts);
}

function timeAgo(date: Date | null): string {
  if (!date) return "-";
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.round(diffMs / 60000);

  if (diffMin < 1) return "hace unos segundos";
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffHrs = Math.round(diffMin / 60);
  if (diffHrs < 24) return `hace ${diffHrs} h`;
  const diffDays = Math.round(diffHrs / 24);
  return `hace ${diffDays} día${diffDays === 1 ? "" : "s"}`;
}

function formatDateTime(date: Date | null): string {
  if (!date) return "-";
  return date.toLocaleString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ============================
// App (Auth gate)
// ============================

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setInitializing(false);
    });

    return () => unsub();
  }, []);

  if (initializing) {
    // Pantalla de carga mientras se resuelve el estado de Auth
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.safeArea}>
          <StatusBar
            barStyle="light-content"
            backgroundColor={colors.background}
          />
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primarySoft} />
            <Text style={styles.loadingText}>Cargando BeeCare…</Text>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      {user ? <BeeCareHome user={user} /> : <AuthScreen />}
    </SafeAreaProvider>
  );
}

// ============================
// Pantalla principal BeeCare
// ============================

function BeeCareHome({ user }: { user: User }) {
  const [audios, setAudios] = useState<AudioReport[]>([]);

  useEffect(() => {
    // Referencia a users/<uid>/hives/<hive_id>/audios
    const audiosRef = collection(
      db,
      "users",
      user.uid,
      "hives",
      FIXED_HIVE_ID,
      "audios"
    );

    const q = query(audiosRef, orderBy("createdAt", "desc"));

    const unsub = onSnapshot(q, (snapshot) => {
      const items: AudioReport[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as any),
      }));
      setAudios(items);
    });

    return () => unsub();
  }, [user.uid]);

  const latest = useMemo(
    () => (audios.length > 0 ? audios[0] : null),
    [audios]
  );

  const latestDate = timestampToDate(latest?.createdAt ?? null);
  const latestPredictionKey = (latest?.prediction ?? "").toLowerCase();
  const latestLabel =
    PREDICTION_LABELS[latestPredictionKey] ?? latest?.prediction ?? "—";
  const latestColor =
    PREDICTION_COLORS[latestPredictionKey] ?? colors.textSubtle;
  const latestProbPercent = latest
    ? Math.round((latest.probability ?? 0) * 100)
    : null;

  const renderItem = ({ item }: { item: AudioReport }) => {
    const date = timestampToDate(item.createdAt ?? null);
    const key = (item.prediction ?? "").toLowerCase();
    const label = PREDICTION_LABELS[key] ?? item.prediction ?? "—";
    const color = PREDICTION_COLORS[key] ?? colors.textSubtle;
    const prob = Math.round((item.probability ?? 0) * 100);

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.predictionRow}>
            <View style={[styles.statusDot, { backgroundColor: color }]} />
            <Text style={styles.predictionText}>{label}</Text>
          </View>
          <Text style={styles.cardTime}>{timeAgo(date)}</Text>
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.cardLabel}>Probabilidad</Text>
          <Text style={styles.cardValue}>{prob}%</Text>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.cardFooterText}>{formatDateTime(date)}</Text>
          <Text style={styles.cardSource}>{item.source ?? "device_gcs"}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={colors.background}
      />
      <View style={styles.container}>
        {/* Header superior con logout */}
        <View style={styles.topRow}>
          <View>
            <Text style={styles.appTitle}>BeeCare</Text>
            <Text style={styles.appSubtitle}>Monitoreo de colmenas</Text>
          </View>

          <TouchableOpacity onPress={() => signOut(auth)}>
            <Text style={styles.logoutText}>Cerrar sesión</Text>
          </TouchableOpacity>
        </View>

        {/* Tarjeta de resumen de la colmena */}
        <View style={styles.hiveCard}>
          <View style={styles.hiveHeaderRow}>
            <Text style={styles.hiveName}>Colmena 1</Text>
            <Text style={styles.hiveLastUpdate}>{timeAgo(latestDate)}</Text>
          </View>

          <Text style={styles.hiveStatusLabel}>Estado actual</Text>
          <View style={styles.hiveStatusRow}>
            <View
              style={[styles.hiveStatusPill, { backgroundColor: latestColor }]}
            >
              <Text style={styles.hiveStatusText}>{latestLabel}</Text>
            </View>
            {latestProbPercent !== null && (
              <Text style={styles.hiveProbability}>
                {latestProbPercent}% confianza
              </Text>
            )}
          </View>

          <Text style={styles.hiveHint}>
            Cada nuevo audio analizado actualizará este estado automáticamente.
          </Text>
        </View>

        {/* Historial */}
        <View style={styles.listHeaderRow}>
          <Text style={styles.listTitle}>Historial de análisis</Text>
          <Text style={styles.listCount}>{audios.length} registros</Text>
        </View>

        <FlatList
          data={audios}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </SafeAreaView>
  );
}

// ============================
// Estilos
// ============================

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 12,
    color: colors.textMain,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  logoutText: {
    fontSize: 12,
    color: beePalette.coral,
    fontWeight: "600",
  },
  appTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: colors.primaryText,
  },
  appSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 0,
  },
  hiveCard: {
    backgroundColor: colors.cardElevated,
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  hiveHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  hiveName: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.textMain,
  },
  hiveLastUpdate: {
    fontSize: 12,
    color: colors.textSubtle,
  },
  hiveStatusLabel: {
    fontSize: 13,
    color: colors.textSubtle,
    marginBottom: 4,
  },
  hiveStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  hiveStatusPill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  hiveStatusText: {
    color: colors.primaryText,
    fontWeight: "600",
    fontSize: 14,
  },
  hiveProbability: {
    marginLeft: 8,
    fontSize: 13,
    color: colors.textMain,
  },
  hiveHint: {
    fontSize: 12,
    color: colors.textSubtle,
    marginTop: 4,
  },
  listHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textMain,
  },
  listCount: {
    fontSize: 12,
    color: colors.textSubtle,
  },
  listContent: {
    paddingBottom: 24,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  predictionRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    marginRight: 6,
  },
  predictionText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textMain,
  },
  cardTime: {
    fontSize: 11,
    color: colors.textSubtle,
  },
  cardBody: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  cardLabel: {
    fontSize: 12,
    color: colors.textSubtle,
  },
  cardValue: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textMain,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  cardFooterText: {
    fontSize: 11,
    color: colors.textSubtle,
  },
  cardSource: {
    fontSize: 11,
    color: colors.textSubtle,
  },
});
