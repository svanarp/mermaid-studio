import type { Store } from "./state";
import type { AppState, Tab } from "./types";
import { makeTab } from "./storage";

export interface TabCallbacks {
  onSelect(id: string): void;
}

export interface TabApi {
  addTab(): void;
  renameCurrent(): void;
  closeCurrent(): void;
}

export function initTabs(
  container: HTMLElement,
  store: Store<AppState>,
  cb: TabCallbacks
): TabApi {
  function state(): AppState {
    return store.get();
  }

  function activeTab(): Tab | undefined {
    const s = state();
    return s.tabs.find((t) => t.id === s.activeId);
  }

  function render(): void {
    const s = state();
    container.textContent = "";
    for (const tab of s.tabs) {
      container.appendChild(makeTabEl(tab, tab.id === s.activeId));
    }
    const add = document.createElement("button");
    add.className = "tab-add";
    add.title = "New diagram (Ctrl+N)";
    add.textContent = "+";
    add.addEventListener("click", addTab);
    container.appendChild(add);
  }

  function makeTabEl(tab: Tab, active: boolean): HTMLElement {
    const el = document.createElement("div");
    el.className = "tab" + (active ? " active" : "");
    el.dataset.tabId = tab.id;
    el.title = tab.name;

    const name = document.createElement("span");
    name.className = "tab-name";
    name.textContent = tab.name;
    el.appendChild(name);

    el.addEventListener("click", (e) => {
      if (e.target === el || e.target === name) cb.onSelect(tab.id);
    });
    name.addEventListener("dblclick", (e) => {
      e.stopPropagation();
      startRename(tab);
    });

    const close = document.createElement("button");
    close.className = "tab-close";
    close.title = "Close (Ctrl+W)";
    close.textContent = "\u00d7";
    close.addEventListener("click", (e) => {
      e.stopPropagation();
      closeTab(tab.id);
    });
    el.appendChild(close);
    return el;
  }

  function startRename(tab: Tab): void {
    const el = container.querySelector<HTMLElement>(
      `[data-tab-id="${tab.id}"]`
    );
    const nameEl = el?.querySelector(".tab-name") as HTMLElement | null;
    if (!el || !nameEl) return;
    nameEl.style.display = "none";
    const input = document.createElement("input");
    input.value = tab.name;
    el.appendChild(input);
    input.focus();
    input.select();
    let done = false;
    const commit = () => {
      if (done) return;
      done = true;
      const val = input.value.trim() || tab.name;
      store.update((s) => {
        const target = s.tabs.find((x) => x.id === tab.id);
        if (target) target.name = val;
      });
      input.remove();
      nameEl.style.display = "";
    };
    input.addEventListener("blur", commit);
    input.addEventListener("keydown", (e) => {
      e.stopPropagation();
      if (e.key === "Enter") {
        e.preventDefault();
        commit();
      } else if (e.key === "Escape") {
        done = true;
        input.remove();
        nameEl.style.display = "";
      }
    });
  }

  function addTab(): void {
    const tab = makeTab(`Diagram ${state().tabs.length + 1}`, "");
    store.update((s) => {
      s.tabs.push(tab);
      s.activeId = tab.id;
    });
    cb.onSelect(tab.id);
  }

  function closeTab(id: string): void {
    const s = state();
    if (s.tabs.length <= 1) return;
    const idx = s.tabs.findIndex((t) => t.id === id);
    if (idx < 0) return;
    store.update((cur) => {
      cur.tabs = cur.tabs.filter((t) => t.id !== id);
      if (cur.activeId === id) {
        const next = cur.tabs[Math.max(0, idx - 1)] ?? cur.tabs[0];
        cur.activeId = next.id;
        cb.onSelect(next.id);
      }
    });
  }

  function closeCurrent(): void {
    const s = state();
    closeTab(s.activeId);
  }

  store.subscribe(render);
  render();

  return { addTab, renameCurrent: () => activeTab() && startRename(activeTab()!), closeCurrent };
}