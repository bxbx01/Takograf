import { useState, useEffect } from 'react';

/**
 * A custom hook to manage state that is persisted in localStorage.
 * @param key The key to use in localStorage.
 * @param initialValue The initial value if nothing is in localStorage.
 * @param parseFn A function to parse the string from localStorage.
 * @param stringifyFn A function to stringify the state for localStorage.
 * @returns A state and a setState function, just like useState.
 */
function usePersistentState<T>(
  key: string,
  initialValue: T,
  parseFn: (value: string | null) => T,
  stringifyFn: (value: T) => string
) {
  const [state, setState] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      return parseFn(item);
    } catch (error) {
      console.error(`Error reading localStorage key “${key}”:`, error);
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, stringifyFn(state));
    } catch (error) {
      console.error(`Error setting localStorage key “${key}”:`, error);
    }
  }, [key, state, stringifyFn]);

  return [state, setState] as const;
}

export default usePersistentState;
