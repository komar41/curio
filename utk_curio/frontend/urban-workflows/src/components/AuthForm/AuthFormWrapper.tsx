import React, { ReactNode } from "react";
import CSS from "csstype";
import curioLogoWhite from "assets/curio_logo_white.png";

interface Props {
  children: ReactNode;
}

export const AuthFormWrapper: React.FC<Props> = ({ children }) => {
  return (
    <div style={outerStyle}>
      <div style={leftPanelStyle}>
        <img
          src={curioLogoWhite}
          alt="Curio"
          style={logoStyle}
        />
        <p style={taglineStyle}>Visual dataflows for urban data</p>
      </div>
      <div style={rightPanelStyle}>{children}</div>
    </div>
  );
};

const outerStyle: CSS.Properties = {
  display: "flex",
  minHeight: "100vh",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', Helvetica, Arial, sans-serif",
};

const leftPanelStyle: CSS.Properties = {
  width: "42%",
  backgroundColor: "#0F0F11",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "28px",
  padding: "40px",
};

const logoStyle: CSS.Properties = {
  width: "60%",
  maxWidth: "340px",
  height: "auto",
};

const taglineStyle: CSS.Properties = {
  color: "#D8D8D8",
  fontSize: "17px",
  fontWeight: 400,
  letterSpacing: "1px",
  margin: 0,
  textAlign: "center",
};

const rightPanelStyle: CSS.Properties = {
  width: "58%",
  backgroundColor: "#ffffff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "40px",
};
