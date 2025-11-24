// src/theme.ts

// Paleta original BeeCare (por si quieres usarla directo en otros lados)
export const beePalette = {
  primary: "#2E5E2A",   // --color-bee-primary
  leaf: "#6BA36B",      // --color-bee-leaf
  cream: "#F5FAF2",     // --color-bee-cream
  yellow: "#F3C93A",    // --color-bee-yellow
  coral: "#E96A5D",     // --color-bee-coral
  pink: "#F7B4C0",      // --color-bee-pink
  lavender: "#B69CCF",  // --color-bee-lavender
  orange: "#F2A65A",    // --color-bee-orange
  brown: "#5C4B3A",     // --color-bee-brown
};

// Tema de la app (modo oscuro usando la paleta)
export const colors = {
  // Fondo general (oscuro con tinte verde)
  background: "#050A08",
  backgroundSoft: "#101B12",

  // Tarjetas
  card: "#050A08",
  cardElevated: "#101B12",
  cardBorder: "#1D2A1C",

  // Marca principal
  primary: beePalette.primary,
  primarySoft: beePalette.leaf,
  primaryText: beePalette.cream,

  // Estados de colmena
  healthy: beePalette.leaf,    // Colmena sana
  danger: beePalette.coral,    // Reina ausente / alerta

  // Texto
  textMain: beePalette.cream,
  textMuted: "#B7C4B7",
  textSubtle: "#7A857A",

  // Navegación / iconos
  tabBackground: "#050A08",
  tabIconActive: beePalette.yellow,
  tabIconInactive: "#4B5A4B",

  // Otros
  separator: "#1D2A1C",
};
