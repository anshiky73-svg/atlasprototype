import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Scholarship Intelligence",
    template: "%s · Scholarship Intelligence",
  },
  description: "Evidence-backed scholarship discovery and verification for Indian students.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>
        <div className="app-frame">
          <aside className="sidebar">
            <Link className="brand" href="/">
              <span className="brand-mark">S</span>
              <span className="brand-copy">
                <strong>Scholarship</strong>
                <small>INTELLIGENCE</small>
              </span>
            </Link>
            <div className="nav-section-label">WORKSPACE</div>
            <nav className="main-nav" aria-label="Main navigation">
              <Link className="nav-link" href="/">
                <span className="nav-icon">◫</span> Overview
              </Link>
              <Link className="nav-link" href="/scholarships">
                <span className="nav-icon">▤</span> Scholarships
              </Link>
              <Link className="nav-link" href="/crawler">
                <span className="nav-icon">↻</span> Crawler runs
              </Link>
            </nav>
            <div className="sidebar-bottom">
              <div className="trust-card">
                <span className="trust-mark">✓</span>
                <strong>Evidence first</strong>
                <p>Every verified record links back to a primary source.</p>
              </div>
              <span className="sidebar-version">Scholarship Intelligence · v1</span>
            </div>
          </aside>
          <div className="main-frame">
            <header className="topbar">
              <div className="breadcrumb">Research workspace <span>/</span> India</div>
              <div className="topbar-status"><span /> Evidence-based data</div>
            </header>
            <main className="main-content">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
