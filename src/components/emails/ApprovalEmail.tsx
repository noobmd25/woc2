// React email template for approval notification using Resend's react option.
// Keep styles simple and inline for maximum client compatibility.
// This component purposefully avoids external dependencies.

import * as React from "react";

export interface ApprovalEmailProps {
  name: string;
  loginUrl: string;
  baseUrl: string;
  supportEmail?: string;
}

export function ApprovalEmail({
  name,
  loginUrl,
  baseUrl,
  supportEmail,
}: ApprovalEmailProps) {
  const safeName = name || "there";
  const year = new Date().getFullYear();
  const logoUrl = `${baseUrl.replace(/\/$/, "")}/logo.png`;
  const support = supportEmail || "support@premuss.org";
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <title>Access Granted</title>
        <meta name="viewport" content="width=device-width,initial-scale=1" />
      </head>
      <body style={bodyStyle}>
        <div style={containerStyle}>
          <div style={heroStyle}>
            <a
              href={loginUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: "inline-block" }}
            >
              <img
                src={logoUrl}
                alt="Who's On Call Logo"
                style={{ maxWidth: 160, height: "auto" }}
              />
            </a>
          </div>
          <div style={contentStyle}>
            <h2 style={headingStyle}>Access Granted ✅</h2>
            <p style={pStyle}>Hi {safeName},</p>
            <p style={pStyle}>
              Your request to access <strong>Who&apos;s On Call</strong> has
              been approved by an administrator.
            </p>
            <p style={pStyle}>
              You can now log in and start using the platform:
            </p>
            <p style={{ ...pStyle, margin: "32px 0" }}>
              <a href={loginUrl} style={buttonStyle}>
                Log In
              </a>
            </p>
            <p style={pStyle}>
              If you have any questions,{" "}
              <a href={`mailto:${support}`} style={linkStyle}>
                contact {support}
              </a>
              .
            </p>
            <p style={pStyle}>— The Who&apos;s On Call Team</p>
          </div>
          <div style={footerStyle}>
            © {year} Who&apos;s On Call. All rights reserved.
          </div>
        </div>
      </body>
    </html>
  );
}

// Inline style objects
const bodyStyle: React.CSSProperties = {
  margin: 0,
  padding: 0,
  fontFamily:
    "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
  backgroundColor: "#f9f9f9",
  color: "#222",
};

const containerStyle: React.CSSProperties = {
  maxWidth: 600,
  margin: "0 auto",
  backgroundColor: "#ffffff",
  borderRadius: 8,
  overflow: "hidden",
};

const heroStyle: React.CSSProperties = {
  backgroundColor: "#0070f3",
  padding: 20,
  textAlign: "center" as const,
};

const contentStyle: React.CSSProperties = {
  padding: 32,
};

const headingStyle: React.CSSProperties = {
  color: "#0070f3",
  marginTop: 0,
  fontSize: 24,
  fontWeight: 600,
};

const pStyle: React.CSSProperties = {
  margin: "16px 0",
  lineHeight: 1.5,
  fontSize: 16,
};

const buttonStyle: React.CSSProperties = {
  backgroundColor: "#0070f3",
  color: "#ffffff",
  textDecoration: "none",
  padding: "12px 24px",
  borderRadius: 6,
  display: "inline-block",
  fontWeight: 500,
};

const linkStyle: React.CSSProperties = {
  color: "#0070f3",
  textDecoration: "underline",
};

const footerStyle: React.CSSProperties = {
  textAlign: "center" as const,
  fontSize: 12,
  color: "#777",
  padding: 16,
};

export default ApprovalEmail;
