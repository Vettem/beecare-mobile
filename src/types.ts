// src/types.ts
export type AudioReport = {
  id: string;
  audioPath: string;
  prediction: string;    // "sana" | "reina_ausente" hoy, pero dejamos string
  probability: number;
  source: string;
  status: string;
  createdAt?: any;       // Firestore Timestamp
};