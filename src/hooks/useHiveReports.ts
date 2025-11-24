// src/hooks/useHiveReports.ts
import { useEffect, useState } from "react";
import { db, collection, query, orderBy, onSnapshot } from "../firebase";
import { FIXED_UID, FIXED_HIVE_ID } from "../config";
import { AudioReport } from "../types";

export function useHiveReports() {
  const [reports, setReports] = useState<AudioReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const audiosRef = collection(
      db,
      "users",
      FIXED_UID,
      "hives",
      FIXED_HIVE_ID,
      "audios"
    );

    const q = query(audiosRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: AudioReport[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        items.push({
          id: doc.id,
          audioPath: data.audioPath,
          prediction: data.prediction,
          probability: data.probability,
          source: data.source,
          status: data.status,
          createdAt: data.createdAt,
        });
      });
      setReports(items);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { reports, loading };
}