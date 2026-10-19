import { isValidElement, type ReactNode } from "react";

// Minimal JSX → SVG markup serializer for static artwork (no hooks, no events).
// Used for social preview images, where react-dom/server isn't allowed.
const KEEP_CASE = new Set(["viewBox", "preserveAspectRatio", "gradientUnits", "gradientTransform", "clipPathUnits"]);

function attrName(name: string) {
  if (name === "className") return "class";
  if (KEEP_CASE.has(name)) return name;
  return name.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}

function escape(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function svgToString(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return escape(String(node));
  if (Array.isArray(node)) return node.map(svgToString).join("");
  if (!isValidElement(node)) return "";
  const { type } = node;
  const props = (node.props ?? {}) as Record<string, unknown> & { children?: ReactNode };
  if (typeof type === "function") return svgToString((type as (p: unknown) => ReactNode)(props));
  if (typeof type !== "string") return svgToString(props.children);
  const attrs = Object.entries(props)
    .filter(([k, v]) => k !== "children" && v !== undefined && v !== null && v !== false && typeof v !== "function")
    .map(([k, v]) => {
      if (k === "style" && typeof v === "object") {
        const css = Object.entries(v as Record<string, unknown>)
          .map(([sk, sv]) => `${attrName(sk)}:${sv}`)
          .join(";");
        return ` style="${escape(css)}"`;
      }
      return ` ${attrName(k)}="${escape(String(v))}"`;
    })
    .join("");
  return `<${type}${attrs}>${svgToString(props.children)}</${type}>`;
}
