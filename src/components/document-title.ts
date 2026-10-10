"use client";

import { useLayoutEffect } from "react";
import { documentTitle } from "@/lib/document-title";
import { rutas } from "@/lib/routes";
import { tabKey } from "@/lib/tabs";

let override: string | null = null;
let fallback: HTMLTitleElement | null = null;

function sync() {
  if (override !== null && document.title !== override) document.title = override;
  const first = document.head.querySelector("title");
  const text = first && first !== fallback ? (first.textContent ?? "").trim() : "";
  if (!text) return;
  if (!fallback?.isConnected) {
    fallback = document.createElement("title");
    fallback.setAttribute("itemprop", "name");
    document.head.append(fallback);
  }
  if (fallback.textContent !== text) fallback.textContent = text;
}

export function DocumentTitleKeeper() {
  useLayoutEffect(() => {
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.head, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, []);
  return null;
}

export function useWorkspaceTitleScope() {
  useLayoutEffect(
    () => () => {
      override = null;
    },
    []
  );
}

export function useWorkspaceDocumentTitle(materiaId: string, materiaName: string, key: string, title: string) {
  const inicio = key === tabKey(rutas.materia(materiaId));
  const next = documentTitle(inicio ? null : title, materiaName);
  useLayoutEffect(() => {
    override = next;
    sync();
  }, [next]);
}
