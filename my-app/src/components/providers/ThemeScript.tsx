import { THEME_STORAGE_KEY } from "@/src/lib/theme/constants";

/**
 * Pre-paint script that applies the persisted (or system) theme class.
 * Rendered in <head> to avoid a light->dark flash. No dependencies.
 */
export function ThemeScript() {
  const script = `(function(){try{var k=${JSON.stringify(
    THEME_STORAGE_KEY,
  )};var t=localStorage.getItem(k);var d=t==="dark"||(t!=="light"&&(window.matchMedia("(prefers-color-scheme: dark)").matches||t==="dark"));document.documentElement.classList.toggle("dark",d);document.documentElement.style.colorScheme=d?"dark":"light";}catch(e){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
