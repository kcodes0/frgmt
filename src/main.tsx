import React, { useEffect } from "react";
import { createRoot } from "react-dom/client";
import Home from "./pages/Home";
import Essays from "./pages/Essays";
import Notes from "./pages/Notes";
import PostPage from "./pages/Post";
import Admin from "./pages/Admin";
import Chrome from "./Chrome";
import { navigate, usePath } from "./router";
import "./styles.css";

function NotFound() {
  useEffect(() => {
    document.title = "not found — jwz - frgmt.xyz";
  }, []);
  return (
    <Chrome>
      <main id="main" style={{ marginTop: "clamp(32px, 6vh, 64px)" }}>
        <h1 className="line">There is nothing at this address.</h1>
        <p className="more">
          <a href="/">Home</a>
        </p>
      </main>
    </Chrome>
  );
}

function Root() {
  const path = usePath();

  // plain internal links join the SPA: one listener for the whole site
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element).closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target || a.origin !== location.origin) return;
      if (a.protocol === "mailto:") return;
      e.preventDefault();
      navigate(a.pathname);
    };
    addEventListener("click", onClick);
    return () => removeEventListener("click", onClick);
  }, []);

  if (path === "/") return <Home />;
  if (path === "/essays" || path === "/blog") return <Essays />;
  // old /blog/... links keep working; /essays/... is canonical
  if (path.startsWith("/essays/"))
    return <PostPage key={path} slug={decodeURIComponent(path.slice(8))} />;
  if (path.startsWith("/blog/"))
    return <PostPage key={path} slug={decodeURIComponent(path.slice(6))} />;
  if (path === "/notes") return <Notes />;
  if (path === "/admin" || path.startsWith("/admin/")) return <Admin />;
  return <NotFound />;
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
