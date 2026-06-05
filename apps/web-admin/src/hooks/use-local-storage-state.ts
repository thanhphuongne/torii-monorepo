import { useState, useEffect, useRef } from 'react';

export interface Options<T> {
  defaultValue?: T | (() => T);
  serializer?: (value: T) => string;
  deserializer?: (value: string) => T;
  listenStorageChange?: boolean;
}

function useLocalStorageState<T>(key: string, options?: Options<T>) {
  const {
    defaultValue,
    serializer = JSON.stringify,
    deserializer = JSON.parse,
    listenStorageChange = false,
  } = options || {};

  const [state, setState] = useState<T | undefined>(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        return deserializer(item);
      }
      if (defaultValue instanceof Function) {
        return defaultValue();
      }
      return defaultValue;
    } catch (error) {
      console.error(error);
      if (defaultValue instanceof Function) {
        return defaultValue();
      }
      return defaultValue;
    }
  });

  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    try {
      if (state === undefined) {
        window.localStorage.removeItem(key);
      } else {
        window.localStorage.setItem(key, serializer(state));
      }
    } catch (error) {
      console.error(error);
    }
  }, [key, state, serializer]);

  useEffect(() => {
    if (listenStorageChange) {
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === key && e.newValue) {
          try {
            setState(deserializer(e.newValue));
          } catch (error) {
            console.error(error);
          }
        }
      };
      window.addEventListener('storage', handleStorageChange);
      return () => window.removeEventListener('storage', handleStorageChange);
    }
  }, [key, listenStorageChange, deserializer]);

  return [state, setState] as const;
}

export default useLocalStorageState;
