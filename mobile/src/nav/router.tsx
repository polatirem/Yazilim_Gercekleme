/**
 * Navigation. The web app's routes (/, /quest, /quest/[slug], /play, …) become
 * typed route objects on a small stack. Tabs reset the stack; Android's back
 * button pops it and leaves the app only from the root.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { BackHandler } from "react-native";

export type Route =
  | { name: "world" }
  | { name: "quest"; mystery?: boolean }
  | { name: "questDetail"; slug: string }
  | { name: "play" }
  | { name: "journey" }
  | { name: "codex"; entry?: string | null }
  | { name: "playground" }
  | { name: "settings" }
  | { name: "begin" }
  | { name: "dev" };

export type RouteName = Route["name"];

interface Nav {
  route: Route;
  /** Increments on every navigation, so screens remount like page loads. */
  key: number;
  depth: number;
  push: (route: Route) => void;
  replace: (route: Route) => void;
  reset: (route: Route) => void;
  back: () => void;
}

const NavContext = createContext<Nav | null>(null);

export function useNav(): Nav {
  const nav = useContext(NavContext);
  if (!nav) throw new Error("useNav outside NavProvider");
  return nav;
}

export function NavProvider({ children, initial = { name: "world" } }: { children: ReactNode; initial?: Route }) {
  const [state, setState] = useState<{ stack: Route[]; key: number }>({ stack: [initial], key: 0 });

  const push = useCallback((route: Route) => setState((s) => ({ stack: [...s.stack, route], key: s.key + 1 })), []);
  const replace = useCallback((route: Route) => setState((s) => ({ stack: [...s.stack.slice(0, -1), route], key: s.key + 1 })), []);
  const reset = useCallback(
    (route: Route) => setState((s) => ({ stack: route.name === "world" ? [route] : [{ name: "world" }, route], key: s.key + 1 })),
    [],
  );
  const back = useCallback(
    () => setState((s) => (s.stack.length > 1 ? { stack: s.stack.slice(0, -1), key: s.key + 1 } : s)),
    [],
  );

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (state.stack.length > 1) {
        back();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [state.stack.length, back]);

  const value = useMemo<Nav>(
    () => ({ route: state.stack[state.stack.length - 1], key: state.key, depth: state.stack.length, push, replace, reset, back }),
    [state, push, replace, reset, back],
  );
  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
}
