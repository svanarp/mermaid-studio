import { highlight } from "./highlighter";

export interface Editor {
  getValue(): string;
  setValue(v: string): void;
  focus(): void;
  onInput(cb: () => void): void;
  onScroll(): void;
}

const BASE_PAD = 14;

function scrollbarSize(el: HTMLElement): { w: number; h: number } {
  return {
    w: Math.max(0, el.offsetWidth - el.clientWidth),
    h: Math.max(0, el.offsetHeight - el.clientHeight),
  };
}

export function initEditor(
  textarea: HTMLTextAreaElement,
  layer: HTMLPreElement,
  onInput: () => void
): Editor {
  function sync(): void {
    const sb = scrollbarSize(textarea);
    layer.style.paddingRight = `${BASE_PAD + sb.w}px`;
    layer.style.paddingBottom = `${BASE_PAD + sb.h}px`;
    layer.scrollTop = textarea.scrollTop;
    layer.scrollLeft = textarea.scrollLeft;
  }

  function paint(): void {
    layer.innerHTML = highlight(textarea.value);
  }

  textarea.addEventListener("input", () => {
    paint();
    sync();
    onInput();
  });

  textarea.addEventListener("scroll", sync);
  window.addEventListener("resize", sync);
  new ResizeObserver(sync).observe(textarea);

  // First paint for any pre-seeded value
  paint();
  sync();

  return {
    getValue: () => textarea.value,
    setValue(v: string) {
      textarea.value = v;
      paint();
      sync();
    },
    focus: () => textarea.focus(),
    onInput,
    onScroll: sync,
  };
}