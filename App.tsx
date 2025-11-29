// App.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  auth,
  db,
  collection,
  query,
  orderBy,
  onSnapshot,
  limit,
} from "./src/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { colors } from "./src/theme";
import AuthScreen from "./src/AuthScreen";

type AudioReport = {
  id: string;
  audioPath: string;
  prediction: string;
  probability: number;
  source: string;
  status: string;
  createdAt?: any; // Firestore Timestamp u otro
};

type Hive = {
  id: string;
  name?: string;
};

type Mode = "summary" | "detail" | "account";

// Traducción bonita para mostrar
const PREDICTION_LABELS: Record<string, string> = {
  con_reina: "Reina presente (colmena estable)",
  sin_reina: "Reina ausente",
  // Compatibilidad con modelos anteriores
  sana: "Colmena sana",
  reina_ausente: "Reina ausente",
};

// Colores por estado
const PREDICTION_COLORS: Record<string, string> = {
  con_reina: colors.healthy, // verde
  sin_reina: colors.danger, // rojo
  // Compatibilidad con modelos anteriores
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

export default function App() {
  const [authUser, setAuthUser] = useState<any | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Modo de pantalla
  const [mode, setMode] = useState<Mode>("summary");

  // Colmenas del usuario
  const [hives, setHives] = useState<Hive[]>([]);
  const [hivesLoading, setHivesLoading] = useState(false);
  const [hivesRefreshing, setHivesRefreshing] = useState(false);

  // Mapa hiveId -> último análisis (para la pantalla de resumen)
  const [latestByHive, setLatestByHive] = useState<
    Record<string, AudioReport | null>
  >({});

  // Colmena seleccionada para la vista detalle
  const [selectedHiveId, setSelectedHiveId] = useState<string | null>(null);

  // Audios de la colmena seleccionada
  const [audios, setAudios] = useState<AudioReport[]>([]);
  const [audiosLoading, setAudiosLoading] = useState(false);
  const [audiosRefreshing, setAudiosRefreshing] = useState(false);

  // Detalle de un audio (modal)
  const [selectedAudio, setSelectedAudio] = useState<AudioReport | null>(null);
  const [showAudioDetail, setShowAudioDetail] = useState(false);

  // ---------------------------
  // 1) Escuchar estado de Auth
  // ---------------------------
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      setAuthLoading(false);
      // Cada vez que cambia de usuario, volvemos a la vista resumen
      setMode("summary");
      setSelectedHiveId(null);
      setAudios([]);
    });

    return () => unsub();
  }, []);

  // ---------------------------
  // 2) Suscribirse a las colmenas del usuario
  // ---------------------------
  useEffect(() => {
    if (!authUser) {
      setHives([]);
      setLatestByHive({});
      return;
    }

    setHivesLoading(true);

    const hivesRef = collection(db, "users", authUser.uid, "hives");
    const qHives = query(hivesRef, orderBy("name", "asc"));

    const unsub = onSnapshot(
      qHives,
      (snapshot) => {
        const list: Hive[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as any),
        }));
        setHives(list);
        setHivesLoading(false);
        setHivesRefreshing(false);
      },
      () => {
        setHivesLoading(false);
        setHivesRefreshing(false);
      }
    );

    return () => unsub();
  }, [authUser]);

  // -------------------------------------------------------
  // 3) Para cada colmena, escuchar SOLO el último análisis
  //    (para mostrar en la pantalla de resumen)
  // -------------------------------------------------------
  useEffect(() => {
    if (!authUser || hives.length === 0) {
      setLatestByHive({});
      return;
    }

    const unsubscribers: Array<() => void> = [];

    hives.forEach((hive) => {
      const audiosRef = collection(
        db,
        "users",
        authUser.uid,
        "hives",
        hive.id,
        "audios"
      );
      const qLatest = query(
        audiosRef,
        orderBy("createdAt", "desc"),
        limit(1)
      );

      const unsub = onSnapshot(qLatest, (snapshot) => {
        const latestDoc = snapshot.docs[0];
        setLatestByHive((prev) => ({
          ...prev,
          [hive.id]: latestDoc
            ? {
              id: latestDoc.id,
              ...(latestDoc.data() as any),
            }
            : null,
        }));
      });

      unsubscribers.push(unsub);
    });

    return () => {
      unsubscribers.forEach((u) => u());
    };
  }, [authUser, hives]);

  // ---------------------------------------------
  // 4) Audios de la colmena seleccionada (detalle)
  // ---------------------------------------------
  useEffect(() => {
    if (!authUser || !selectedHiveId) {
      setAudios([]);
      return;
    }

    setAudiosLoading(true);

    const audiosRef = collection(
      db,
      "users",
      authUser.uid,
      "hives",
      selectedHiveId,
      "audios"
    );

    const qAudios = query(audiosRef, orderBy("createdAt", "desc"));

    const unsub = onSnapshot(
      qAudios,
      (snapshot) => {
        const items: AudioReport[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as any),
        }));
        setAudios(items);
        setAudiosLoading(false);
        setAudiosRefreshing(false);
      },
      () => {
        setAudiosLoading(false);
        setAudiosRefreshing(false);
      }
    );

    return () => unsub();
  }, [authUser, selectedHiveId]);

  // ---------------------------
  // 5) Derivados para el detalle
  // ---------------------------
  const latestForSelected = useMemo(
    () =>
      selectedHiveId ? latestByHive[selectedHiveId] ?? null : null,
    [latestByHive, selectedHiveId]
  );

  const latestDate = timestampToDate(latestForSelected?.createdAt ?? null);
  const latestPredictionKey = (latestForSelected?.prediction ?? "").toLowerCase();
  const latestLabel =
    PREDICTION_LABELS[latestPredictionKey] ??
    latestForSelected?.prediction ??
    "—";
  const latestColor =
    PREDICTION_COLORS[latestPredictionKey] ?? colors.primarySoft;
  const latestProbPercent = latestForSelected
    ? Math.round((latestForSelected.probability ?? 0) * 100)
    : null;

  const selectedHive = selectedHiveId
    ? hives.find((h) => h.id === selectedHiveId) ?? null
    : null;

  // ---------------------------
  // Handlers
  // ---------------------------
  const handleRefreshHives = () => {
    if (!authUser) return;
    setHivesRefreshing(true);
    setTimeout(() => setHivesRefreshing(false), 800);
  };

  const handleRefreshAudios = () => {
    if (!authUser || !selectedHiveId) return;
    setAudiosRefreshing(true);
    setTimeout(() => setAudiosRefreshing(false), 800);
  };

  const handleAudioPress = (item: AudioReport) => {
    setSelectedAudio(item);
    setShowAudioDetail(true);
  };

  // ---------------------------
  // Render de ítems de historial
  // ---------------------------
  const renderAudioItem = ({ item }: { item: AudioReport }) => {
    const date = timestampToDate(item.createdAt ?? null);
    const key = (item.prediction ?? "").toLowerCase();
    const label = PREDICTION_LABELS[key] ?? item.prediction ?? "—";
    const color = PREDICTION_COLORS[key] ?? colors.primarySoft;
    const prob = Math.round((item.probability ?? 0) * 100);

    return (
      <TouchableOpacity onPress={() => handleAudioPress(item)}>
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
      </TouchableOpacity>
    );
  };

  // ============================
  //   Pantallas
  // ============================

  // Estado inicial: cargando auth
  if (authLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" />
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // No hay usuario -> pantalla de Auth
  if (!authUser) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" />
        <AuthScreen />
      </SafeAreaView>
    );
  }

  // ---------------------------
  // Pantalla de CUENTA
  // ---------------------------
  if (mode === "account") {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" />
        <View style={styles.container}>
          {/* Header con volver */}
          <View style={styles.headerRow}>
            <TouchableOpacity
              onPress={() => setMode("summary")}
              style={{ marginRight: 12 }}
            >
              <Text style={styles.backText}>◀ Volver</Text>
            </TouchableOpacity>

            <View style={{ flex: 1 }}>
              <Text style={styles.appTitle}>BeeCare</Text>
              <Text style={styles.appSubtitle}>Tu cuenta</Text>
            </View>
          </View>

          {/* Tarjeta cuenta */}
          <View style={styles.accountCard}>
            <Text style={styles.accountTitle}>Datos de tu cuenta</Text>

            <View style={styles.accountRow}>
              <Text style={styles.accountLabel}>Correo</Text>
              <Text style={styles.accountValue}>
                {authUser.email ?? "Sin correo"}
              </Text>
            </View>

            <View style={styles.accountRow}>
              <Text style={styles.accountLabel}>UID</Text>
              <Text style={styles.accountValueMono}>{authUser.uid}</Text>
            </View>

            <View style={styles.accountInfoBox}>
              <Text style={styles.accountInfoTitle}>
                ¿Para qué sirve este UID?
              </Text>
              <Text style={styles.accountInfoText}>
                Comparte este identificador cuando configures un dispositivo
                BeeCare. Así, los audios de tus colmenas se enviarán
                directamente a tu cuenta y aparecerán en esta app.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.logoutButton}
              onPress={() => signOut(auth)}
            >
              <Text style={styles.logoutButtonText}>Cerrar sesión</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ---------------------------
  // Pantalla de RESUMEN (todas las colmenas)
  // ---------------------------
  if (mode === "summary") {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" />
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.appTitle}>BeeCare</Text>
              <Text style={styles.appSubtitle}>Monitoreo de colmenas</Text>
            </View>
            <TouchableOpacity onPress={() => setMode("account")}>
              <Text style={styles.accountLinkText}>Cuenta</Text>
            </TouchableOpacity>
          </View>

          {/* Lista de colmenas */}
          <Text style={styles.listTitle}>Tus colmenas</Text>

          {hivesLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : hives.length === 0 ? (
            <Text style={styles.emptyText}>
              Aún no tienes colmenas registradas. Cuando se procese el primer
              audio para este usuario, se creará una colmena automáticamente.
            </Text>
          ) : (
            <FlatList
              data={hives}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingTop: 8, paddingBottom: 24 }}
              refreshing={hivesRefreshing}
              onRefresh={handleRefreshHives}
              renderItem={({ item }) => {
                const latest = latestByHive[item.id] ?? null;
                const latestDate = timestampToDate(latest?.createdAt ?? null);
                const key = (latest?.prediction ?? "").toLowerCase();
                const label =
                  latest &&
                  (PREDICTION_LABELS[key] ?? latest.prediction ?? "—");
                const color =
                  latest &&
                  (PREDICTION_COLORS[key] ?? colors.primarySoft);

                return (
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedHiveId(item.id);
                      setMode("detail");
                    }}
                    style={styles.hiveSummaryCard}
                  >
                    <View style={styles.hiveSummaryHeader}>
                      <Text style={styles.hiveName}>
                        {item.name ?? `Colmena ${item.id}`}
                      </Text>
                      <Text style={styles.hiveLastUpdate}>
                        {latest ? timeAgo(latestDate) : "sin datos"}
                      </Text>
                    </View>

                    {latest ? (
                      <View style={styles.hiveStatusRow}>
                        <View
                          style={[
                            styles.hiveStatusPill,
                            { backgroundColor: color ?? colors.primarySoft },
                          ]}
                        >
                          <Text style={styles.hiveStatusText}>{label}</Text>
                        </View>
                        <Text style={styles.hiveProbability}>
                          {Math.round((latest.probability ?? 0) * 100)}%
                          {" confianza"}
                        </Text>
                      </View>
                    ) : (
                      <Text style={styles.summaryNoData}>
                        Sin análisis aún. Cuando se procese el primer audio,
                        verás el estado aquí.
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>
      </SafeAreaView>
    );
  }

  // ---------------------------
  // Pantalla de DETALLE de colmena
  // ---------------------------
  const modalDate = timestampToDate(selectedAudio?.createdAt ?? null);
  const modalKey = (selectedAudio?.prediction ?? "").toLowerCase();
  const modalLabel =
    PREDICTION_LABELS[modalKey] ?? selectedAudio?.prediction ?? "—";
  const modalColor =
    PREDICTION_COLORS[modalKey] ?? colors.primarySoft;
  const modalProb =
    selectedAudio != null
      ? Math.round((selectedAudio.probability ?? 0) * 100)
      : null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <View style={styles.container}>
        {/* Header con botón volver y acceso a cuenta */}
        <View style={styles.headerRow}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <TouchableOpacity
              onPress={() => {
                setMode("summary");
                setSelectedHiveId(null);
              }}
              style={{ marginRight: 12 }}
            >
              <Text style={styles.backText}>◀ Volver</Text>
            </TouchableOpacity>
            <View>
              <Text style={styles.appTitle}>BeeCare</Text>
              <Text style={styles.appSubtitle}>
                Monitoreo de colmenas
              </Text>
            </View>
          </View>

          <TouchableOpacity onPress={() => setMode("account")}>
            <Text style={styles.accountLinkText}>Cuenta</Text>
          </TouchableOpacity>
        </View>

        {/* Tarjeta de resumen de la colmena seleccionada */}
        <View style={styles.hiveCard}>
          <View style={styles.hiveHeaderRow}>
            <Text style={styles.hiveName}>
              {selectedHive?.name ?? `Colmena ${selectedHive?.id ?? ""}`}
            </Text>
            <Text style={styles.hiveLastUpdate}>
              {latestForSelected ? timeAgo(latestDate) : "sin datos"}
            </Text>
          </View>

          <Text style={styles.hiveStatusLabel}>Estado actual</Text>

          {latestForSelected ? (
            <>
              <View style={styles.hiveStatusRow}>
                <View
                  style={[
                    styles.hiveStatusPill,
                    { backgroundColor: latestColor },
                  ]}
                >
                  <Text style={styles.hiveStatusText}>{latestLabel}</Text>
                </View>
              </View>

              {latestProbPercent !== null && (
                <Text style={styles.hiveProbabilityBelow}>
                  {latestProbPercent}% confianza
                </Text>
              )}

              <Text style={styles.hiveHint}>
                Cada nuevo audio analizado actualizará este estado
                automáticamente.
              </Text>
            </>
          ) : (
            <>
              <View style={styles.hiveStatusRow}>
                <View
                  style={[
                    styles.hiveStatusPill,
                    { backgroundColor: colors.primarySoft },
                  ]}
                >
                  <Text style={styles.hiveStatusText}>Sin análisis aún</Text>
                </View>
              </View>
              <Text style={styles.hiveHint}>
                Aún no hay análisis para esta colmena. En cuanto se procese el
                primer audio, verás el estado aquí.
              </Text>
            </>
          )}
        </View>

        {/* Historial */}
        <View style={styles.listHeaderRow}>
          <Text style={styles.listTitle}>Historial de análisis</Text>
          <Text style={styles.listCount}>{audios.length} registros</Text>
        </View>

        {audiosLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : audios.length === 0 ? (
          <Text style={styles.emptyText}>
            Esta colmena aún no tiene análisis. Cuando se suba el primer
            audio, verás los resultados aquí.
          </Text>
        ) : (
          <FlatList
            data={audios}
            keyExtractor={(item) => item.id}
            renderItem={renderAudioItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshing={audiosRefreshing}
            onRefresh={handleRefreshAudios}
          />
        )}

        {/* Modal de detalle de audio */}
        <Modal
          visible={showAudioDetail && !!selectedAudio}
          transparent
          animationType="slide"
          onRequestClose={() => setShowAudioDetail(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalTitleRow}>
                <View style={styles.predictionRow}>
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: modalColor },
                    ]}
                  />
                  <Text style={styles.modalTitle}>{modalLabel}</Text>
                </View>
                <TouchableOpacity onPress={() => setShowAudioDetail(false)}>
                  <Text style={styles.modalCloseText}>Cerrar</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.modalSubtitle}>
                Detalles del análisis
              </Text>

              <View style={styles.modalSection}>
                <Text style={styles.modalLabel}>Probabilidad</Text>
                <Text style={styles.modalValue}>
                  {modalProb != null ? `${modalProb}%` : "—"}
                </Text>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalLabel}>Fecha y hora</Text>
                <Text style={styles.modalValue}>
                  {formatDateTime(modalDate)}
                </Text>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalLabel}>Origen</Text>
                <Text style={styles.modalValue}>
                  {selectedAudio?.source ?? "device_gcs"}
                </Text>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalLabel}>Ruta del audio</Text>
                <Text style={styles.modalValueMono}>
                  {selectedAudio?.audioPath ?? "—"}
                </Text>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

// =====================
//   ESTILOS
// =====================
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  appTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: colors.textMain,
  },
  appSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
  },
  backText: {
    fontSize: 14,
    color: colors.primarySoft,
  },
  accountLinkText: {
    fontSize: 14,
    color: colors.primarySoft,
    fontWeight: "600",
  },

  // Tarjeta de colmena detalle
  hiveCard: {
    backgroundColor: colors.cardElevated,
    borderRadius: 16,
    padding: 16,
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
    marginBottom: 4,
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
  hiveProbabilityBelow: {
    fontSize: 13,
    color: colors.textMain,
    marginTop: 4,
  },
  hiveHint: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
  },

  // Lista / resumen de colmenas
  listTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textMain,
    marginBottom: 8,
  },
  listCount: {
    fontSize: 12,
    color: colors.textSubtle,
  },
  listHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  listContent: {
    paddingBottom: 24,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 12,
  },

  // Tarjetas de historial
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

  // Tarjeta de resumen de colmena en la lista
  hiveSummaryCard: {
    backgroundColor: colors.cardElevated,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  hiveSummaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  summaryNoData: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
  },

  // Account screen
  accountCard: {
    backgroundColor: colors.cardElevated,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  accountTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.textMain,
    marginBottom: 16,
  },
  accountRow: {
    marginBottom: 12,
  },
  accountLabel: {
    fontSize: 12,
    color: colors.textSubtle,
    marginBottom: 2,
  },
  accountValue: {
    fontSize: 14,
    color: colors.textMain,
  },
  accountValueMono: {
    fontSize: 13,
    color: colors.textMain,
    fontFamily: "monospace",
  },
  accountInfoBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.backgroundSoft,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  accountInfoTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textMain,
    marginBottom: 4,
  },
  accountInfoText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  logoutButton: {
    marginTop: 20,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: colors.danger,
    alignItems: "center",
  },
  logoutButtonText: {
    color: colors.primaryText,
    fontSize: 14,
    fontWeight: "600",
  },

  // Modal detalle de audio
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: colors.cardElevated,
    padding: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  modalTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textMain,
  },
  modalSubtitle: {
    fontSize: 12,
    color: colors.textSubtle,
    marginBottom: 8,
  },
  modalCloseText: {
    fontSize: 13,
    color: colors.primarySoft,
    fontWeight: "600",
  },
  modalSection: {
    marginTop: 8,
  },
  modalLabel: {
    fontSize: 12,
    color: colors.textSubtle,
    marginBottom: 2,
  },
  modalValue: {
    fontSize: 14,
    color: colors.textMain,
  },
  modalValueMono: {
    fontSize: 12,
    color: colors.textMain,
    fontFamily: "monospace",
  },
});
