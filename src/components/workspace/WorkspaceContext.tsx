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
import { usePathname } from "next/navigation";
import type { WorkspaceFocus } from "@/lib/types";
import { tabKey } from "@/lib/tabs";
import { useWorkspaceDocumentTitle, useWorkspaceTitleScope } from "@/components/document-title";
import type { IconName } from "@/components/ui/Icon";
import { tabsStore } from "./tabs-store";

export type FocusInfo = WorkspaceFocus & { titulo: string };

type AskOptions = { send?: boolean };

type OpenChatOptions = { focusComposer?: boolean };

export type WorkspaceValue = {
  materiaId: string;
  materiaName: string;
  focus: FocusInfo | null;
  setFocus: (focus: FocusInfo | null) => void;
  focusEnabled: boolean;
  setFocusEnabled: (enabled: boolean) => void;
  chatOpen: boolean;
  openChat: (opts?: OpenChatOptions) => void;
  closeChat: () => void;
  toggleChat: () => void;
  mobileChatOpen: boolean;
  askChat: (text: string, options?: AskOptions) => void;
  registerAsk: (handler: (text: string, options?: AskOptions) => void) => () => void;
  registerComposerFocus: (handler: () => void) => () => void;
  refreshToken: number;
  bumpRefresh: () => void;
};

type ChatLayout = {
  reportColumnFits: (fits: boolean) => void;
  closeOverlay: () => void;
  isChatVisible: () => boolean;
};

const WorkspaceContext = createContext<WorkspaceValue | null>(null);
const ChatLayoutContext = createContext<ChatLayout | null>(null);

const CHAT_OPEN_KEY = "arq.chat.open";
const CHAT_OPEN_EVENT = "arq-chat-open";
const DESKTOP_QUERY = "(min-width: 1024px)";

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
  return typeof window !== "undefined" && window.matchMedia(DESKTOP_QUERY).matches;
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
  const composerHandler = useRef<(() => void) | null>(null);
  const pendingComposerFocus = useRef(false);
  const columnFits = useRef(true);
  const overlayOpen = useRef(false);

  useEffect(() => {
    overlayOpen.current = mobileChatOpen;
  }, [mobileChatOpen]);

  const columnMode = useCallback(() => isDesktop() && columnFits.current, []);

  const focusComposer = useCallback(() => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        if (composerHandler.current) composerHandler.current();
        else pendingComposerFocus.current = true;
      });
    });
  }, []);

  const openChat = useCallback(
    (opts?: OpenChatOptions) => {
      if (columnMode()) writeChatOpen(true);
      else setMobileChatOpen(true);
      if (opts?.focusComposer) focusComposer();
    },
    [columnMode, focusComposer]
  );

  const closeChat = useCallback(() => {
    if (columnMode()) writeChatOpen(false);
    else setMobileChatOpen(false);
  }, [columnMode]);

  const toggleChat = useCallback(() => {
    if (columnMode()) writeChatOpen(!readChatOpen());
    else setMobileChatOpen((open) => !open);
  }, [columnMode]);

  const closeOverlay = useCallback(() => setMobileChatOpen(false), []);

  const reportColumnFits = useCallback((fits: boolean) => {
    columnFits.current = fits;
    if (fits && isDesktop()) setMobileChatOpen(false);
  }, []);

  const isChatVisible = useCallback(
    () => (columnMode() ? readChatOpen() : overlayOpen.current),
    [columnMode]
  );

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

  const registerComposerFocus = useCallback((handler: () => void) => {
    composerHandler.current = handler;
    if (pendingComposerFocus.current) {
      pendingComposerFocus.current = false;
      window.requestAnimationFrame(() => handler());
    }
    return () => {
      if (composerHandler.current === handler) composerHandler.current = null;
    };
  }, []);

  const bumpRefresh = useCallback(() => setRefreshToken((n) => n + 1), []);
  useWorkspaceTitleScope();

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
      registerComposerFocus,
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
      registerComposerFocus,
      refreshToken,
      bumpRefresh,
    ]
  );

  const layout = useMemo<ChatLayout>(
    () => ({ reportColumnFits, closeOverlay, isChatVisible }),
    [reportColumnFits, closeOverlay, isChatVisible]
  );

  return (
    <WorkspaceContext.Provider value={value}>
      <ChatLayoutContext.Provider value={layout}>{children}</ChatLayoutContext.Provider>
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace(): WorkspaceValue {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error("useWorkspace fuera de una materia");
  return value;
}

export function useOptionalWorkspace(): WorkspaceValue | null {
  return useContext(WorkspaceContext);
}

export function useChatLayout(): ChatLayout {
  const value = useContext(ChatLayoutContext);
  if (!value) throw new Error("useChatLayout fuera de una materia");
  return value;
}

function useTabTitle(title: string, icon?: string) {
  const { materiaId, materiaName } = useWorkspace();
  const pathname = usePathname();
  const key = tabKey(pathname);
  useEffect(() => {
    tabsStore.setTitle(materiaId, key, title, icon);
  }, [materiaId, key, title, icon]);
  useWorkspaceDocumentTitle(materiaId, materiaName, key, title);
}

export function FocusRegister({ kind, id, titulo, icon }: FocusInfo & { icon?: IconName }) {
  const { setFocus } = useWorkspace();
  useTabTitle(titulo, icon);
  useEffect(() => {
    setFocus({ kind, id, titulo });
    return () => setFocus(null);
  }, [kind, id, titulo, setFocus]);
  return null;
}

export function TabMeta({ title }: { title: string }) {
  useTabTitle(title);
  return null;
}
