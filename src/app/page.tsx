// src/app/page.tsx
import Link from "next/link";

export default function Home() {
  return (
    <main style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", textAlign: "center",
      padding: "2rem", color: "#1D1D1D",
      background: "radial-gradient(ellipse at 50% 0%, #FEFAE0 0%, #FAF8F0 55%)",
      fontFamily: "'Source Serif 4', Georgia, serif",
    }}>
      <div style={{
        fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: "1.5rem",
        color: "#3D2B1F", marginBottom: "2.5rem", lineHeight: 1.1,
      }}>
        Regenerative&nbsp;Stewards
        <span style={{
          display: "block", fontFamily: "'JetBrains Mono', monospace",
          fontSize: "0.6rem", letterSpacing: "0.35em", color: "#2D6A4F", marginTop: "0.4rem",
        }}>APP</span>
      </div>
      <h1 style={{
        fontFamily: "'Fraunces', serif", fontWeight: 700,
        fontSize: "clamp(1.9rem, 5vw, 3rem)", color: "#3D2B1F",
        maxWidth: "16ch", lineHeight: 1.15, margin: "0 0 1rem",
      }}>
        Your land has a voice.
      </h1>
      <p style={{
        fontSize: "1.1rem", fontStyle: "italic", color: "#6B705C",
        maxWidth: "32ch", lineHeight: 1.6, margin: "0 0 2.5rem",
      }}>
        This app helps you translate it.
      </p>
      <Link href="/login" style={{
        display: "inline-block", background: "#2D6A4F", color: "#FEFAE0",
        fontWeight: 600, fontSize: "1rem", padding: "0.85rem 2.4rem",
        borderRadius: "100px", textDecoration: "none",
        boxShadow: "0 4px 14px rgba(45,106,79,0.25)",
      }}>
        Sign in
      </Link>
      <p style={{ marginTop: "1.25rem", fontSize: "0.85rem", color: "#6B705C" }}>
        New here?{" "}
        <Link href="/login" style={{ color: "#2D6A4F", textDecoration: "underline" }}>
          Create your account
        </Link>
      </p>
    </main>
  );
}
