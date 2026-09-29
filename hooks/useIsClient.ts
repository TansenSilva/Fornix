import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** true só no navegador — para exibir datas/horas no fuso do aparelho sem erro de hidratação. */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
