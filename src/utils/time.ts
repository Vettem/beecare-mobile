// src/utils/time.ts
export function formatTimeAgo(date?: Date | null) {
  if (!date) return "fecha desconocida";

  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / (1000 * 60));

  if (diffMin < 1) return "hace segundos";
  if (diffMin < 60) return `hace ${diffMin} min`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `hace ${diffHours} h`;

  const diffDays = Math.floor(diffHours / 24);
  return `hace ${diffDays} d`;
}

export function firestoreTimestampToDate(ts: any): Date | null {
  if (!ts) return null;
  if (typeof ts.toDate === "function") return ts.toDate();
  return new Date(ts);
}
