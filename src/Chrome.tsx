import { useEffect, useRef, useState, type ReactNode } from "react";
import { initialTheme, persist, swapTheme, type Theme } from "./theme";

/**
 * The paper around every page: the italic mark, the room links, and the
 * lamp. The theme swap keeps its circular wipe from the old site; it was
 * the one piece of route 03 worth carrying across.
 */
export default function Chrome({
  children,
  room,
}: {
  children: ReactNode;
  room?: "essays" | "notes";
}) {
  const [theme, setTheme] = useState<Theme>("light");
  const [reduced, setReduced] = useState(true);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const t = initialTheme();
    setTheme(t);
    persist(t);
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const onToggle = async () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    const box = toggleRef.current?.getBoundingClientRect();
    const origin = box
      ? { x: box.left + box.width / 2, y: box.top + box.height / 2 }
      : { x: window.innerWidth, y: 0 };
    await swapTheme(next, origin, setTheme, reduced);
  };

  return (
    <div className="page">
      <a className="skip" href="#main">
        Skip to content
      </a>
      <header className="top">
        <a className="mark" href="/">
          frgmt
        </a>
        <nav aria-label="Rooms">
          <a href="/essays" aria-current={room === "essays" ? "page" : undefined}>
            essays
          </a>
          <a href="/notes" aria-current={room === "notes" ? "page" : undefined}>
            notes
          </a>
        </nav>
        <button
          ref={toggleRef}
          className="lamp"
          onClick={onToggle}
          aria-pressed={theme === "dark"}
          aria-label={theme === "dark" ? "Switch to light" : "Switch to dark"}
        >
          {theme === "dark" ? "light" : "dark"}
        </button>
      </header>
      {children}
    </div>
  );
}
