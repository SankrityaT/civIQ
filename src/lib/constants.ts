// ─── Brand Colors ─────────────────────────────────────────────────────────────

export const colors = {
  navy: {
    50:  "#f0f4f8",
    100: "#d9e2ec",
    200: "#bcccdc",
    300: "#9fb3c8",
    400: "#829ab1",
    500: "#627d98",
    600: "#486581",
    700: "#334e68",
    800: "#243b53",
    900: "#102a43",
  },
  gold: {
    50:  "#fffbea",
    100: "#fff3c4",
    200: "#fce588",
    300: "#fadb5f",
    400: "#f7c948",
    500: "#f0b429",
    600: "#de911d",
    700: "#cb6e17",
    800: "#b44d12",
    900: "#8d2b0b",
  },
  success: "#10B981",
  warning: "#F59E0B",
  error:   "#EF4444",
  info:    "#3B82F6",
};

// ─── App Config ───────────────────────────────────────────────────────────────

export const APP_NAME    = "Civiq";
export const MASCOT_NAME = "Sam";
export const GROQ_MODEL  = "llama-3.3-70b-versatile";

// ─── Nav Links ────────────────────────────────────────────────────────────────

export const DASHBOARD_NAV = [
  { label: "Overview",   href: "/dashboard" },
  { label: "Documents",  href: "/dashboard/documents" },
  { label: "Test AI",    href: "/dashboard/test" },
  { label: "Recruit",    href: "/dashboard/recruit" },
  { label: "Audit Log",  href: "/dashboard/audit" },
];

// ─── Electioneering restricted-zone distance ─────────────────────────────────

export const ELECTIONEERING_FEET = 75;
