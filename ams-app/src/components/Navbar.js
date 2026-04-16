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

  // Close mobile menu when resizing to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) setMobileOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <nav className={`navbar ${scrolled ? "scrolled" : ""}`}>
      <Link href="/" className="navbar-logo">
        <img src="/ams-logo.png" alt="AMS Logo" style={{ width: '36px', height: '36px', objectFit: 'contain' }} />
        AMS
      </Link>

      <ul className={`navbar-links ${mobileOpen ? "navbar-links-open" : ""}`}>
        <li><a href="#hero" onClick={() => setMobileOpen(false)}>Home</a></li>
        <li><a href="#features" onClick={() => setMobileOpen(false)}>Features</a></li>
        <li><a href="#dashboard" onClick={() => setMobileOpen(false)}>Dashboard</a></li>
        <li className="navbar-mobile-cta">
          <Link href="/login" onClick={() => setMobileOpen(false)}>Get Started</Link>
        </li>
      </ul>

      <Link href="/login" className="navbar-cta navbar-cta-desktop">Get Started</Link>

      <button
        className="navbar-hamburger"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle menu"
      >
        <span className={mobileOpen ? "hamburger-open" : ""}></span>
        <span className={mobileOpen ? "hamburger-open" : ""}></span>
        <span className={mobileOpen ? "hamburger-open" : ""}></span>
      </button>
    </nav>
  );
}
