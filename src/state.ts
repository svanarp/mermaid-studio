export type Listener = () => void;

export interface Store<T> {
  get(): T;
  set(next: T): void;
  update(fn: (cur: T) => void): void;
  subscribe(fn: Listener): () => void;
}

export function createStore<T>(initial: T): Store<T> {
  let current = initial;
  const listeners = new Set<Listener>();
  return {
    get: () => current,
    set(next: T) {
      current = next;
      listeners.forEach((fn) => fn());
    },
    update(fn: (cur: T) => void) {
      fn(current);
      listeners.forEach((fn) => fn());
    },
    subscribe(fn: Listener) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}