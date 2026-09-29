import { useEffect, useState } from "react";
import type { ReactElement } from "react";
import { Link } from "@tanstack/react-router";

import { NesIcon } from "@/design-system/nes-229931";

interface SocialLink {
  /** Accessible label, e.g. "MikeDemo on LinkedIn". */
  readonly label: string;
  /** Absolute URL, opened in a new tab. */
  readonly href: string;
  /** NES pixel social icon name. */
  readonly icon: "linkedin" | "twitter" | "instagram" | "github";
  /** Visible text next to the icon. */
  readonly text: string;
}

const SOCIAL_LINKS: readonly SocialLink[] = [
  {
    label: "MikeDemo on GitHub",
    href: "https://github.com/Mike-Demo",
    icon: "github",
    text: "GitHub",
  },
  {
    label: "MikeDemo on LinkedIn",
    href: "https://www.linkedin.com/in/mikedemopoulos",
    icon: "linkedin",
    text: "LinkedIn",
  },
  {
    label: "MikeDemo on X",
    href: "https://x.com/mike_demo",
    icon: "twitter",
    text: "X",
  },
  {
    label: "@demo on tweet.app",
    href: "https://app.tweet.app/post/92206629-1525-4a74-8f51-39e226fc9e75",
    icon: "twitter",
    text: "tweet.app",
  },
  {
    label: "MikeDemo on Threads",
    href: "https://www.threads.com/@mdemop",
    icon: "instagram",
    text: "Threads",
  },
];

/**
 * Pixel site footer: attribution, copyright, open-source credits link, legal
 * policy links, and social icons. The year resolves after hydration so
 * prerendered pages never mismatch.
 */
export function SiteFooter(): ReactElement {
  const [year, setYear] = useState<number | undefined>(undefined);

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  return (
    <div className="site-footer">
      <div className="site-footer-meta">
        <span>Made by MikeDemo</span>
        {year === undefined ? null : <span aria-label={`Copyright ${year}`}>© {year}</span>}
      </div>

      <nav aria-label="Legal links" className="site-footer-legal">
        <Link to="/licenses" className="site-footer-link">
          <NesIcon name="coin" size="small" />
          Open Source
        </Link>
        <Link to="/developers" className="site-footer-link">
          Developers
        </Link>
        <Link to="/constellation" className="site-footer-link">
          Constellation
        </Link>
        <Link to="/emoji" className="site-footer-link">
          Emoji Oracle
        </Link>
        <a
          href="https://embed.termageddon.com/api/policy/TWpjeVZrZEhNRmR2V1UxbU4wRTlQUT09"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Privacy Policy (opens in new tab)"
          className="site-footer-link"
        >
          Privacy Policy
        </a>
        <a
          href="https://embed.termageddon.com/api/policy/Y1ZKdFNtTTJSMVpUTW1sNmJsRTlQUT09"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Terms of Service (opens in new tab)"
          className="site-footer-link"
        >
          Terms of Service
        </a>
      </nav>

      <nav aria-label="Social links" className="site-footer-social">
        {SOCIAL_LINKS.map((link) => (
          <a
            key={link.href}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${link.label} (opens in new tab)`}
            className="site-footer-link"
          >
            <NesIcon name={link.icon} size="small" />
            {link.text}
          </a>
        ))}
      </nav>
    </div>
  );
}
