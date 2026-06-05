import * as React from "react";

// ============================================================================

type MapOrEntries<K, V> = Map<K, V> | [K, V][];

type UseMapActions<K, V> = {
  set: (key: K, value: V) => void;
  setAll: (entries: MapOrEntries<K, V>) => void;
  remove: (key: K) => void;
  reset: Map<K, V>["clear"];
};

type UseMapReturn<K, V> = [
  Omit<Map<K, V>, "set" | "clear" | "delete">,
  UseMapActions<K, V>
];

export function useMap<K, V>(
  initialState: MapOrEntries<K, V> = new Map()
): UseMapReturn<K, V> {
  const [map, setMap] = React.useState(new Map(initialState));

  const actions: UseMapActions<K, V> = {
    set: React.useCallback((key, value) => {
      setMap((prev) => {
        const copy = new Map(prev);
        copy.set(key, value);
        return copy;
      });
    }, []),

    setAll: React.useCallback((entries) => {
      setMap(() => new Map(entries));
    }, []),

    remove: React.useCallback((key) => {
      setMap((prev) => {
        const copy = new Map(prev);
        copy.delete(key);
        return copy;
      });
    }, []),

    reset: React.useCallback(() => {
      setMap(() => new Map());
    }, []),
  };

  return [map, actions];
}

export type { MapOrEntries, UseMapActions, UseMapReturn };

// ============================================================================