// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  Timestamp,
  collection,
  doc,
  onSnapshot,
  query,
  orderBy,
  limit,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getAuth, initializeAuth, getReactNativePersistence, } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBLRgRxn6qLbsX--p9mW8a1Td4Xrv6dq30",
  authDomain: "burnished-web-475115-b8.firebaseapp.com",
  projectId: "burnished-web-475115-b8",
  storageBucket: "burnished-web-475115-b8.firebasestorage.app",
  messagingSenderId: "886200240317",
  appId: "1:886200240317:web:c68185fd974022fdd30fd4",
  measurementId: "G-Z6XM5VRRGW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// ✅ Auth con persistencia en React Native
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

// Exportar Firestore para usar en la app
export const db = getFirestore(app);

// Exporto también helpers que pueden servir
export { Timestamp, collection, doc, onSnapshot, query, orderBy, limit, setDoc, serverTimestamp };