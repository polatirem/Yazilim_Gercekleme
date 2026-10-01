/**
 * Motion primitives: enter (rise + fade), fade and unfold, staggered by index.
 * Every animation communicates a state change; "reduce" disables them all.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Animated, Easing, type StyleProp, type ViewStyle } from "react-native";

export const ReduceMotionContext = createContext(false);
export const useReduceMotion = () => useContext(ReduceMotionContext);

const STAGGER = 110;

export function Enter({
  children,
  i = 0,
  kind = "enter",
  style,
}: {
  children: ReactNode;
  i?: number;
  kind?: "enter" | "fade" | "unfold";
  style?: StyleProp<ViewStyle>;
}) {
  const reduce = useReduceMotion();
  const progress = useState(() => new Animated.Value(reduce ? 1 : 0))[0];

  useEffect(() => {
    if (reduce) {
      progress.setValue(1);
      return;
    }
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: kind === "unfold" ? 700 : 420,
      delay: i * STAGGER,
      easing: kind === "unfold" ? Easing.bezier(0.6, 0, 0.2, 1) : Easing.bezier(0.2, 0.7, 0.2, 1),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [progress, reduce, i, kind]);

  const transform =
    kind === "enter"
      ? [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }]
      : kind === "unfold"
        ? [{ scaleY: progress.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }]
        : [];

  return <Animated.View style={[{ opacity: progress, transform }, style]}>{children}</Animated.View>;
}
