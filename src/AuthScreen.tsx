// src/AuthScreen.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";

import { auth, db } from "./firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { colors } from "./theme";

type Mode = "login" | "register";

const AuthScreen: React.FC = () => {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setError(null);
    if (!email || !password) {
      setError("Completa correo y contraseña.");
      return;
    }

    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, email.trim(), password);
      // App.tsx escuchará el cambio de auth y mostrará BeeCareHome
    } catch (e: any) {
      console.log("Error login", e);
      let msg = "No se pudo iniciar sesión.";
      if (e.code === "auth/invalid-credential") {
        msg = "Correo o contraseña incorrectos.";
      } else if (e.code === "auth/too-many-requests") {
        msg = "Demasiados intentos, inténtalo de nuevo más tarde.";
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    setError(null);
    if (!email || !password) {
      setError("Completa correo y contraseña.");
      return;
    }

    try {
      setLoading(true);
      const cred = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );
      const user = cred.user;

      // 1) Documento principal del usuario
      await setDoc(doc(db, "users", user.uid), {
        email: user.email,
        createdAt: serverTimestamp(),
      });

      // 2) Primera colmena por defecto
      await setDoc(doc(db, "users", user.uid, "hives", "colmena1"), {
        name: "Colmena 1",
        createdAt: serverTimestamp(),
        location: null,
      });

      // Luego App.tsx detecta que hay usuario logeado y muestra BeeCareHome
    } catch (e: any) {
      console.log("Error registro", e);
      let msg = "No se pudo crear la cuenta.";
      if (e.code === "auth/email-already-in-use") {
        msg = "Este correo ya está registrado.";
      } else if (e.code === "auth/weak-password") {
        msg = "La contraseña debe tener al menos 6 caracteres.";
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = () => {
    if (mode === "login") {
      handleLogin();
    } else {
      handleSignUp();
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.safeArea}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.appTitle}>BeeCare</Text>
          <Text style={styles.appSubtitle}>
            Monitoreo inteligente de colmenas
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.modeRow}>
            <TouchableOpacity
              style={[
                styles.modeButton,
                mode === "login" && styles.modeButtonActive,
              ]}
              onPress={() => {
                setMode("login");
                setError(null);
              }}
            >
              <Text
                style={[
                  styles.modeButtonText,
                  mode === "login" && styles.modeButtonTextActive,
                ]}
              >
                Iniciar sesión
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modeButton,
                mode === "register" && styles.modeButtonActive,
              ]}
              onPress={() => {
                setMode("register");
                setError(null);
              }}
            >
              <Text
                style={[
                  styles.modeButtonText,
                  mode === "register" && styles.modeButtonTextActive,
                ]}
              >
                Crear cuenta
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>Correo electrónico</Text>
            <TextInput
              style={styles.input}
              placeholder="usuario@ejemplo.com"
              placeholderTextColor={colors.textSubtle}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />

            <Text style={[styles.label, { marginTop: 12 }]}>Contraseña</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={colors.textSubtle}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            {error && <Text style={styles.errorText}>{error}</Text>}

            <TouchableOpacity
              style={styles.submitButton}
              onPress={onSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <Text style={styles.submitButtonText}>
                  {mode === "login" ? "Entrar" : "Registrarme"}
                </Text>
              )}
            </TouchableOpacity>

            {mode === "login" ? (
              <Text style={styles.helperText}>
                ¿No tienes cuenta?{" "}
                <Text
                  style={styles.helperLink}
                  onPress={() => {
                    setMode("register");
                    setError(null);
                  }}
                >
                  Crear una ahora
                </Text>
              </Text>
            ) : (
              <Text style={styles.helperText}>
                ¿Ya tienes cuenta?{" "}
                <Text
                  style={styles.helperLink}
                  onPress={() => {
                    setMode("login");
                    setError(null);
                  }}
                >
                  Inicia sesión
                </Text>
              </Text>
            )}
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

export default AuthScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  header: {
    marginBottom: 24,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: colors.primaryText,
  },
  appSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 4,
  },
  card: {
    backgroundColor: colors.cardElevated,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  modeRow: {
    flexDirection: "row",
    backgroundColor: colors.background,
    borderRadius: 999,
    padding: 3,
    marginBottom: 16,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 999,
    alignItems: "center",
  },
  modeButtonActive: {
    backgroundColor: colors.primarySoft,
  },
  modeButtonText: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: "500",
  },
  modeButtonTextActive: {
    color: colors.background,
    fontWeight: "700",
  },
  form: {
    marginTop: 4,
  },
  label: {
    fontSize: 12,
    color: colors.textSubtle,
    marginBottom: 4,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    color: colors.textMain,
    fontSize: 14,
  },
  errorText: {
    marginTop: 10,
    color: colors.danger,
    fontSize: 12,
  },
  submitButton: {
    marginTop: 18,
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
  },
  submitButtonText: {
    color: colors.background,
    fontWeight: "700",
    fontSize: 15,
  },
  helperText: {
    marginTop: 12,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: "center",
  },
  helperLink: {
    color: colors.primarySoft,
    fontWeight: "600",
  },
});
