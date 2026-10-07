"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { WorkspaceFocus } from "@/lib/types";

export type FocusInfo = WorkspaceFocus & { titulo: string };

type AskOptions = { send?: boolean };

type WorkspaceValue = {
  materiaId: string;
  materiaName: string;
  focus: FocusInfo | null;
  setFocus: (focus: FocusInfo | null) => void;
  focusEnabled: boolean;
  setFocusEnabled: (enabled: boolean) => void;
  chatOpen: boolean;
  openChat: () => void;
  closeChat: () => void;
  toggleChat: () => void;
  mobileChatOpen: boolean;
  askChat: (text: string, options?: AskOptions) => void;
  registerAsk: (handler: (text: string, options?: AskOptions) => void) => () => void;
  refreshToken: number;
  bumpRefresh: () => void;
};

const WorkspaceContext = createContext<WorkspaceValue | null>(null);

const CHAT_OPEN_KEY = "arq.chat.open";
const CHAT_OPEN_EVENT = "arq-chat-open";

function readChatOpen(): boolean {
  try {
    return window.localStorage.getItem(CHAT_OPEN_KEY) !== "0";
  } catch {
    return true;
  }
}

function writeChatOpen(open: boolean) {
  try {
    window.localStorage.setItem(CHAT_OPEN_KEY, open ? "1" : "0");
  } catch {}
  window.dispatchEvent(new Event(CHAT_OPEN_EVENT));
}

function subscribeChatOpen(callback: () => void) {
  window.addEventListener(CHAT_OPEN_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CHAT_OPEN_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function isDesktop() {
  return typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches;
}

export function WorkspaceProvider({
  materiaId,
  materiaName,
  children,
}: {
  materiaId: string;
  materiaName: string;
  children: React.ReactNode;
}) {
  const [focus, setFocusState] = useState<FocusInfo | null>(null);
  const [focusEnabled, setFocusEnabled] = useState(true);
  const chatOpen = useSyncExternalStore(subscribeChatOpen, readChatOpen, () => true);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const askHandler = useRef<((text: string, options?: AskOptions) => void) | null>(null);
  const pendingAsk = useRef<{ text: string; options?: AskOptions } | null>(null);

  const openChat = useCallback(() => {
    if (isDesktop()) writeChatOpen(true);
    else setMobileChatOpen(true);
  }, []);

  const closeChat = useCallback(() => {
    if (isDesktop()) writeChatOpen(false);
    else setMobileChatOpen(false);
  }, []);

  const toggleChat = useCallback(() => {
    if (isDesktop()) writeChatOpen(!readChatOpen());
    else setMobileChatOpen((open) => !open);
  }, []);

  const setFocus = useCallback((next: FocusInfo | null) => {
    setFocusState((current) => {
      if (current?.id !== next?.id) setFocusEnabled(true);
      return next;
    });
  }, []);

  const askChat = useCallback(
    (text: string, options?: AskOptions) => {
      openChat();
      if (askHandler.current) askHandler.current(text, options);
      else pendingAsk.current = { text, options };
    },
    [openChat]
  );

  const registerAsk = useCallback((handler: (text: string, options?: AskOptions) => void) => {
    askHandler.current = handler;
    if (pendingAsk.current) {
      handler(pendingAsk.current.text, pendingAsk.current.options);
      pendingAsk.current = null;
    }
    return () => {
      if (askHandler.current === handler) askHandler.current = null;
    };
  }, []);

  const bumpRefresh = useCallback(() => setRefreshToken((n) => n + 1), []);

  const value = useMemo<WorkspaceValue>(
    () => ({
      materiaId,
      materiaName,
      focus,
      setFocus,
      focusEnabled,
      setFocusEnabled,
      chatOpen,
      openChat,
      closeChat,
      toggleChat,
      mobileChatOpen,
      askChat,
      registerAsk,
      refreshToken,
      bumpRefresh,
    }),
    [
      materiaId,
      materiaName,
      focus,
      setFocus,
      focusEnabled,
      chatOpen,
      openChat,
      closeChat,
      toggleChat,
      mobileChatOpen,
      askChat,
      registerAsk,
      refreshToken,
      bumpRefresh,
    ]
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceValue {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error("useWorkspace fuera de una materia");
  return value;
}

export function useOptionalWorkspace(): WorkspaceValue | null {
  return useContext(WorkspaceContext);
}

export function FocusRegister({ kind, id, titulo }: FocusInfo) {
  const { setFocus } = useWorkspace();
  useEffect(() => {
    setFocus({ kind, id, titulo });
    return () => setFocus(null);
  }, [kind, id, titulo, setFocus]);
  return null;
}
