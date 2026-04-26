import React, { useState, useEffect } from "react";
import CSS from "csstype";
import { useUserContext } from "../providers/UserProvider";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type UiMode = "openai" | "anthropic" | "gemini" | "custom";

interface ProviderInfo {
  model: string;
  keyLink: string;
  keyLinkLabel: string;
  showBaseUrl: boolean;
  baseUrlPlaceholder?: string;
}

const PROVIDER_INFO: Record<UiMode, ProviderInfo> = {
  openai: {
    model: "gpt-4o-mini",
    keyLink: "https://platform.openai.com/api-keys",
    keyLinkLabel: "Get your OpenAI key",
    showBaseUrl: false,
  },
  anthropic: {
    model: "claude-haiku-4-5-20251001",
    keyLink: "https://console.anthropic.com/keys",
    keyLinkLabel: "Get your Anthropic key",
    showBaseUrl: false,
  },
  gemini: {
    model: "gemini-2.0-flash",
    keyLink: "https://aistudio.google.com/apikey",
    keyLinkLabel: "Get your Gemini key",
    showBaseUrl: false,
  },
  custom: {
    model: "",
    keyLink: "",
    keyLinkLabel: "",
    showBaseUrl: true,
    baseUrlPlaceholder: "http://localhost:11434/v1  (Ollama, LM Studio, vLLM, …)",
  },
};

function uiModeFromSaved(apiType: string | null, baseUrl: string | null): UiMode {
  if (apiType === "anthropic") return "anthropic";
  if (apiType === "gemini") return "gemini";
  if (baseUrl) return "custom";
  return "openai";
}

const LlmSettingsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { user, updateLlmConfig } = useUserContext();

  const [uiMode, setUiMode] = useState<UiMode>("openai");
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState(PROVIDER_INFO.openai.model);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      const mode = uiModeFromSaved(user.llm_api_type, user.llm_base_url);
      setUiMode(mode);
      setBaseUrl(user.llm_base_url || "");
      setApiKey("");
      setModel(user.llm_model || PROVIDER_INFO[mode].model);
      setError(null);
      setSuccess(false);
    }
  }, [isOpen, user]);

  const handleModeChange = (newMode: UiMode) => {
    setUiMode(newMode);
    const defaultModel = PROVIDER_INFO[newMode].model;
    if (defaultModel) {
      setModel(defaultModel);
    }
    if (newMode !== "custom") {
      setBaseUrl("");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const apiType =
        uiMode === "anthropic" ? "anthropic"
        : uiMode === "gemini" ? "gemini"
        : "openai_compatible";

      await updateLlmConfig({
        apiType,
        baseUrl: uiMode === "custom" ? baseUrl : "",
        apiKey: apiKey || undefined,
        model: model || undefined,
      });
      setSuccess(true);
      setApiKey("");
      setTimeout(onClose, 800);
    } catch (e: any) {
      setError(e.message || "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const info = PROVIDER_INFO[uiMode];

  return (
    <div style={overlayStyle} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={modalStyle}>
        <h2 style={titleStyle}>LLM Settings</h2>

        {user?.is_guest ? (
          <>
            <p style={guestNoticeStyle}>
              LLM settings are managed by your administrator.
            </p>
            <div style={buttonRowStyle}>
              <button style={cancelBtnStyle} onClick={onClose}>Close</button>
            </div>
          </>
        ) : (
          <>
            <div style={fieldStyle}>
              <label style={labelStyle}>Provider</label>
              <div style={modeTabsStyle}>
                {(["openai", "anthropic", "gemini", "custom"] as UiMode[]).map((m) => (
                  <button
                    key={m}
                    style={{ ...modeTabStyle, ...(uiMode === m ? modeTabActiveStyle : {}) }}
                    onClick={() => handleModeChange(m)}
                    type="button"
                  >
                    {m === "openai" ? "OpenAI"
                      : m === "anthropic" ? "Anthropic"
                      : m === "gemini" ? "Gemini"
                      : "Custom"}
                  </button>
                ))}
              </div>
            </div>

            {info.showBaseUrl && (
              <div style={fieldStyle}>
                <label style={labelStyle}>Base URL</label>
                <input
                  style={inputStyle}
                  type="text"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder={info.baseUrlPlaceholder}
                />
                <span style={hintStyle}>Any OpenAI-compatible endpoint (Ollama, LM Studio, vLLM, Groq, Azure, …)</span>
              </div>
            )}

            <div style={fieldStyle}>
              <label style={labelStyle}>
                API Key{" "}
                <span style={optionalStyle}>
                  {user?.has_llm_api_key ? "(saved — leave blank to keep)" : uiMode === "custom" ? "(optional for keyless servers)" : "(required)"}
                </span>
              </label>
              <input
                style={inputStyle}
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={user?.has_llm_api_key ? "••••••••  (unchanged)" : "Enter your API key"}
                autoComplete="new-password"
              />
              {info.keyLink && (
                <a href={info.keyLink} target="_blank" rel="noreferrer" style={keyLinkStyle}>
                  {info.keyLinkLabel} →
                </a>
              )}
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>Model</label>
              <input
                style={inputStyle}
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder={info.model || "e.g. llama3.2"}
              />
            </div>

            {error && <p style={errorStyle}>{error}</p>}
            {success && <p style={successStyle}>Settings saved.</p>}

            <div style={buttonRowStyle}>
              <button style={cancelBtnStyle} onClick={onClose} disabled={saving}>
                Cancel
              </button>
              <button style={saveBtnStyle} onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const overlayStyle: CSS.Properties = {
  position: "fixed",
  inset: 0,
  backgroundColor: "rgba(0,0,0,0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
};

const modalStyle: CSS.Properties = {
  backgroundColor: "#fff",
  borderRadius: "8px",
  padding: "28px 32px",
  width: "480px",
  maxWidth: "90vw",
  boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
  fontFamily: "Rubik, -apple-system, BlinkMacSystemFont, sans-serif",
};

const titleStyle: CSS.Properties = {
  margin: "0 0 20px",
  fontSize: "18px",
  fontWeight: 600,
  color: "#1E1F23",
};

const modeTabsStyle: CSS.Properties = {
  display: "flex",
  gap: "6px",
  flexWrap: "wrap",
};

const modeTabStyle: CSS.Properties = {
  padding: "6px 14px",
  border: "1px solid #ddd",
  borderRadius: "4px",
  background: "#fff",
  color: "#555",
  fontSize: "13px",
  cursor: "pointer",
  fontFamily: "inherit",
};

const modeTabActiveStyle: CSS.Properties = {
  border: "1px solid #1E1F23",
  background: "#1E1F23",
  color: "#fff",
  fontWeight: 600,
};

const fieldStyle: CSS.Properties = {
  marginBottom: "16px",
  display: "flex",
  flexDirection: "column",
  gap: "4px",
};

const labelStyle: CSS.Properties = {
  fontSize: "12px",
  fontWeight: 600,
  color: "#555",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

const optionalStyle: CSS.Properties = {
  fontWeight: 400,
  textTransform: "none",
  color: "#999",
  letterSpacing: 0,
};

const hintStyle: CSS.Properties = {
  fontSize: "11px",
  color: "#999",
};

const inputStyle: CSS.Properties = {
  padding: "8px 10px",
  border: "1px solid #ddd",
  borderRadius: "4px",
  fontSize: "13px",
  color: "#1E1F23",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

const keyLinkStyle: CSS.Properties = {
  fontSize: "12px",
  color: "#3567C7",
  textDecoration: "none",
  marginTop: "2px",
};

const buttonRowStyle: CSS.Properties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "8px",
  marginTop: "24px",
};

const cancelBtnStyle: CSS.Properties = {
  padding: "7px 18px",
  border: "1px solid #ddd",
  borderRadius: "4px",
  background: "#fff",
  color: "#555",
  fontSize: "13px",
  cursor: "pointer",
};

const saveBtnStyle: CSS.Properties = {
  padding: "7px 18px",
  border: "none",
  borderRadius: "4px",
  background: "#1E1F23",
  color: "#fff",
  fontSize: "13px",
  fontWeight: 600,
  cursor: "pointer",
};

const errorStyle: CSS.Properties = {
  color: "#c0392b",
  fontSize: "13px",
  margin: "8px 0 0",
};

const successStyle: CSS.Properties = {
  color: "#2F8F4A",
  fontSize: "13px",
  margin: "8px 0 0",
};

const guestNoticeStyle: CSS.Properties = {
  color: "#666",
  fontSize: "14px",
  marginBottom: "8px",
};

export default LlmSettingsModal;
