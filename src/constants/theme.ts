import { Platform } from "react-native";

export const C = {
  background: "#F6F4FB",
  card: "#FFFFFF",
  foreground: "#1F1B2E",
  muted: "#F1EFF6",
  mutedForeground: "#6E6880",
  border: "#E3DFEC",
  primary: "#7C6BB0",
  primaryForeground: "#FFFFFF",
  primarySurface: "#EDE9F7",
  secondary: "#5B9E9E",
  secondarySurface: "#E4F1F1",
  destructive: "#D14343",
  destructiveForeground: "#FFFFFF",
  destructiveSurface: "#FDECEC",
  amber: "#D97706",
  amberSurface: "#FEF3C7",
  amberSurfaceSoft: "#FFFBEB",
  amberBorder: "#FCD34D",
  amberInk: "#78350F",
  green: "#16A34A",
  red: "#EF4444",
  yellow: "#EAB308",
  // status: gravação em andamento — família âmbar (atenção acionável), ver DESIGN.md
  recording: "#D97706",
  recordingSurface: "#FEF3C7",
  recordingPanel: "#FFFBEB",
  recordingBorder: "#FCD34D",
  scrim: "rgba(0,0,0,0.4)",
} as const;

export const Fonts = Platform.select({
  ios: { sans: "system-ui", mono: "ui-monospace" },
  default: { sans: "normal", mono: "monospace" },
})!;
