"use client";

import * as React from "react";

type FontSize = "sm" | "md" | "lg";

const STORAGE_KEY = "font-size";
const DEFAULT: FontSize = "md";
const CLASSES: FontSize[] = ["sm", "md", "lg"];

const FontSizeContext = React.createContext<{
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
}>({ fontSize: DEFAULT, setFontSize: () => {} });

export function FontSizeProvider({ children }: { children: React.ReactNode }) {
  const [fontSize, setFontSizeState] = React.useState<FontSize>(DEFAULT);

  function apply(size: FontSize) {
    const html = document.documentElement;
    CLASSES.forEach((c) => html.classList.remove(`font-size-${c}`));
    html.classList.add(`font-size-${size}`);
  }

  // Read from localStorage on mount and apply class
  React.useEffect(() => {
    const saved = (localStorage.getItem(STORAGE_KEY) as FontSize) ?? DEFAULT;
    apply(saved);
    setFontSizeState(saved);
  }, []);

  function setFontSize(size: FontSize) {
    apply(size);
    localStorage.setItem(STORAGE_KEY, size);
    setFontSizeState(size);
  }

  return (
    <FontSizeContext.Provider value={{ fontSize, setFontSize }}>
      {children}
    </FontSizeContext.Provider>
  );
}

export function useFontSize() {
  return React.useContext(FontSizeContext);
}
