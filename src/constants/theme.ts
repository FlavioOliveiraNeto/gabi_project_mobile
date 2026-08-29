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
  secondary: "#5B9E9E",
  destructive: "#D14343",
  destructiveForeground: "#FFFFFF",
  amber: "#D97706",
  green: "#16A34A",
  red: "#EF4444",
  yellow: "#EAB308",
} as const;

export const Fonts = Platform.select({
  ios: { sans: "system-ui", mono: "ui-monospace" },
  default: { sans: "normal", mono: "monospace" },
})!;
