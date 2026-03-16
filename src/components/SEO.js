import { useEffect } from "react";

function setMeta(selector, attr, value) {
  if (typeof document === "undefined") return;
  let el = document.querySelector(selector);
  if (!el) {
    el = document.createElement("meta");
    if (attr === "property") {
      el.setAttribute("property", selector.replace('meta[property="', "").replace('"]', ""));
    } else {
      el.setAttribute("name", selector.replace('meta[name="', "").replace('"]', ""));
    }
      document.head.appendChild(el);
  }
  if (attr === "property") {
    el.setAttribute("property", selector.replace('meta[property="', "").replace('"]', ""));
  } else {
    el.setAttribute("name", selector.replace('meta[name="', "").replace('"]', ""));
  }
  el.setAttribute("content", value || "");
}

function setLink(rel, href) {
  if (typeof document === "undefined") return;
  let el = document.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href || "");
}

export default function SEO({ title, description, canonical, image, type = "website" }) {
  useEffect(() => {
    if (typeof document === "undefined") return;

    if (title) {
      document.title = title;
      setMeta('meta[property="og:title"]', "property", title);
      setMeta('meta[name="twitter:title"]', "name", title);
    }

    if (description) {
      setMeta('meta[name="description"]', "name", description);
      setMeta('meta[property="og:description"]', "property", description);
      setMeta('meta[name="twitter:description"]', "name", description);
    }

    if (canonical) {
      setLink("canonical", canonical);
      setMeta('meta[property="og:url"]', "property", canonical);
    }

    if (image) {
      setMeta('meta[property="og:image"]', "property", image);
      setMeta('meta[name="twitter:image"]', "name", image);
    }

    setMeta('meta[property="og:type"]', "property", type);
    setMeta('meta[name="twitter:card"]', "name", "summary_large_image");
  }, [title, description, canonical, image, type]);

  return null;
}
