"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav className={`navbar ${scrolled ? "scrolled" : ""}`}>
      <Link href="/" className="navbar-logo">
        <span className="navbar-logo-dots">
          <span className="navbar-logo-dot"></span>
          <span className="navbar-logo-dot"></span>
          <span className="navbar-logo-dot"></span>
        </span>
        AMS
      </Link>

      <ul className="navbar-links">
        <li><a href="#hero">Home</a></li>
        <li><a href="#features">Features</a></li>
        <li><a href="#stats">About</a></li>
        <li><a href="#integrations">Integrations</a></li>
        <li><a href="#footer">Contact</a></li>
      </ul>

      <Link href="/login" className="navbar-cta">Get Started</Link>

      <button
        className="navbar-hamburger"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle menu"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>
    </nav>
  );
}
