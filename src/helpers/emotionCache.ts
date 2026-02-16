import createCache from "@emotion/cache";
import { createTheme } from "@mui/material/styles";
import { ruRU } from "@mui/material/locale";

export function createEmotionCache() {
  return createCache({ key: "css", prepend: true });
}

export const theme = createTheme(
  {
    palette: {
      mode: "dark",
      background: {
        default: "#17151e", // основной фон
        paper: "#1f1c29", // карточки, формы
      },
      primary: {
        main: "#a034fa", // фиолетовый акцент
        contrastText: "#ffffff",
      },
      secondary: {
        main: "#7c3aed", // вспомогательный фиолет
        contrastText: "#ffffff",
      },
      error: {
        main: "#ef4444",
      },
      warning: {
        main: "#f59e0b",
      },
      info: {
        main: "#8b5cf6", // светло-фиолетовый
      },
      success: {
        main: "#22c55e",
      },
      text: {
        primary: "#f8fafc",
        secondary: "#cbd5e1",
        disabled: "#64748b",
      },
      divider: "#2e2b3a",
    },
    typography: {
      fontFamily: "Inter, Roboto, sans-serif",
      fontSize: 14,
      h1: { fontWeight: 600, fontSize: "2.5rem" },
      h2: { fontWeight: 600, fontSize: "2rem" },
      h3: { fontWeight: 500, fontSize: "1.5rem" },
      h4: { fontWeight: 500, fontSize: "1.25rem" },
      h5: { fontWeight: 500, fontSize: "1rem" },
      button: {
        textTransform: "none",
        fontWeight: 500,
      },
    },
    shape: {
      borderRadius: 12,
    },
    components: {
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundColor: "#1f1c29",
            borderRadius: 0,
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            fontWeight: 500,
            textTransform: "none",
            boxShadow: "none",
            "&:hover": {
              boxShadow: "0 0 10px rgba(160, 52, 250, 0.3)",
            },
          },
        },
      },
      MuiTextField: {
        defaultProps: {
          variant: "outlined",
          margin: "normal",
          fullWidth: true,
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            backgroundColor: "#1a1822",
            color: "#ffffff",
            borderRadius: 8,
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: "#3b3750",
            },
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: "#5b5280",
            },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: "#a034fa",
            },
          },
          input: {
            padding: "12px",
          },
        },
      },
      MuiInputLabel: {
        styleOverrides: {
          root: {
            color: "#b0aac2",
            "&.Mui-focused": {
              color: "#a034fa",
            },
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: "#1a1822",
            borderBottom: "1px solid #2e2b3a",
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: "#1a1822",
            color: "#f8fafc",
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            "&.Mui-selected": {
              backgroundColor: "#5b21b6",
              "&:hover": {
                backgroundColor: "#4c1d95",
              },
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundColor: "#221f2e",
            borderRadius: 16,
            boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: "#2e2b3a",
            color: "#f8fafc",
            fontSize: "0.875rem",
          },
        },
      },
      MuiDivider: {
        styleOverrides: {
          root: {
            borderColor: "#2e2b3a",
          },
        },
      },
      MuiLink: {
        styleOverrides: {
          root: {
            color: "#a034fa",
            "&:hover": {
              textDecoration: "underline",
            },
          },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            padding: "12px 16px",
            fontSize: "0.875rem",
            alignItems: "center",
            backgroundColor: "#1a1822",
            color: "#f8fafc",
            borderLeft: "4px solid",
          },
          standardError: {
            backgroundColor: "#1a1822",
            borderColor: "#ef4444",
            color: "#ef4444",
            "& .MuiAlert-icon": {
              color: "#ef4444",
            },
          },
          standardWarning: {
            backgroundColor: "#1a1822",
            borderColor: "#f59e0b",
            color: "#f59e0b",
            "& .MuiAlert-icon": {
              color: "#f59e0b",
            },
          },
          standardInfo: {
            backgroundColor: "#1a1822",
            borderColor: "#8b5cf6",
            color: "#8b5cf6",
            "& .MuiAlert-icon": {
              color: "#8b5cf6",
            },
          },
          standardSuccess: {
            backgroundColor: "#1a1822",
            borderColor: "#22c55e",
            color: "#22c55e",
            "& .MuiAlert-icon": {
              color: "#22c55e",
            },
          },
          icon: {
            marginRight: 12,
          },
          message: {
            padding: 0,
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            backgroundColor: "#1f1c29",
            borderRadius: 16,
            boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
          },
        },
      },
      MuiDialogTitle: {
        styleOverrides: {
          root: {
            fontSize: "1.25rem",
            fontWeight: 600,
            color: "#f8fafc",
            padding: "16px 24px",
            borderBottom: "1px solid #2e2b3a",
            backgroundColor: "#1f1c29",
          },
        },
      },
      MuiDialogContent: {
        styleOverrides: {
          root: {
            color: "#cbd5e1",
            padding: "0px 24px 16px",
            backgroundColor: "#1f1c29",
          },
        },
      },
      MuiDialogActions: {
        styleOverrides: {
          root: {
            padding: "16px 24px",
            borderTop: "1px solid #2e2b3a",
            backgroundColor: "#1f1c29",
          },
        },
      },
      MuiAccordion: {
        styleOverrides: {
          root: {
            backgroundColor: "#1f1c29",
            color: "#f8fafc",
            boxShadow: "none",
            "&:before": {
              display: "none", // убрать линию сверху
            },
            "&.Mui-expanded": {
              margin: 0, // чтобы при раскрытии не увеличивался отступ
            },
          },
        },
      },
      MuiAccordionSummary: {
        styleOverrides: {
          root: {
            backgroundColor: "#221f2e",
            color: "#f8fafc",
            flexDirection: "row",
            padding: "0 16px",
            minHeight: "48px",
            "& .MuiAccordionSummary-content": {
              margin: "12px 0",
            },
            "&.Mui-expanded": {
              minHeight: "48px",
            },
            "&:hover": {
              backgroundColor: "#2a2638",
            },
          },
          expandIconWrapper: {
            color: "#a034fa",
            "&.Mui-expanded": {
              transform: "rotate(90deg)",
            },
          },
        },
      },
      MuiAccordionDetails: {
        styleOverrides: {
          root: {
            padding: "16px",
            backgroundColor: "#262338",
            borderTop: "1px solid #2e2b3a",
            color: "#cbd5e1",
          },
        },
      },
    },
  },
  ruRU,
);
