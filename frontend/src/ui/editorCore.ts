type MaterialChangeListener = (materials: string[]) => void;

class MaterialRegistryClass {
    private materials: string[] = [];
    private listeners: Set<MaterialChangeListener> = new Set();

    register(id: string) {
        if (!this.materials.includes(id)) {
            this.materials.push(id);
            this.notify();
        }
    }

    getAll(): string[] {
        return [...this.materials];
    }

    onChange(fn: MaterialChangeListener): () => void {
        this.listeners.add(fn);
        return () => this.listeners.delete(fn);
    }

    private notify() {
        this.listeners.forEach((fn) => fn(this.getAll()));
    }
}

export const MaterialRegistry = new MaterialRegistryClass();

let sharedStyleInjected = false;

export function injectSharedStyles() {
    if (sharedStyleInjected) return;
    sharedStyleInjected = true;

    const style = document.createElement('style');
    style.textContent = `
        .se-panel {
            position: fixed;
            background: #1a1a1a;
            color: #d4d4d4;
            border: 1px solid #333;
            border-radius: 8px;
            font-family: 'Consolas', 'Menlo', monospace;
            font-size: 12px;
            z-index: 9999;
            user-select: none;
            box-shadow: 0 4px 24px rgba(0,0,0,0.6);
            overflow: hidden;
        }
        .se-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 8px 12px;
            background: #111;
            cursor: grab;
            border-bottom: 1px solid #2a2a2a;
        }
        .se-header:active { cursor: grabbing; }
        .se-title { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #888; }
        .se-grip { color: #444; font-size: 16px; }
        .se-section { padding: 8px 12px; border-bottom: 1px solid #2a2a2a; }
        .se-section:last-child { border-bottom: none; }
        .se-label {
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            color: #666;
            margin-bottom: 6px;
        }
        .se-btn-group { display: flex; flex-direction: column; gap: 4px; }
        .se-type-btn {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 5px 8px;
            background: #222;
            border: 1px solid #333;
            border-radius: 4px;
            color: #aaa;
            font-family: inherit;
            font-size: 12px;
            cursor: pointer;
            text-align: left;
        }
        .se-type-btn em { margin-left: auto; font-style: normal; font-size: 10px; color: #555; }
        .se-type-btn:hover { background: #2a2a2a; }
        .se-type-btn.se-active { border-color: #4a90d9; color: #d4d4d4; }
        .se-select {
            width: 100%;
            background: #222;
            border: 1px solid #333;
            border-radius: 4px;
            color: #aaa;
            font-family: inherit;
            font-size: 12px;
            padding: 4px 6px;
        }
        .se-xyz { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 4px; }
        .se-xyz label {
            display: flex;
            flex-direction: column;
            gap: 2px;
            font-size: 10px;
            color: #666;
        }
        .se-xyz input {
            background: #222;
            border: 1px solid #333;
            border-radius: 4px;
            color: #d4d4d4;
            font-family: inherit;
            font-size: 11px;
            padding: 3px 4px;
            width: 100%;
        }
        .se-xyz input:focus { outline: 1px solid #4a90d9; border-color: transparent; }
        .se-input {
            width: 100%;
            background: #222;
            border: 1px solid #333;
            border-radius: 4px;
            color: #d4d4d4;
            font-family: inherit;
            font-size: 12px;
            padding: 4px 6px;
            box-sizing: border-box;
        }
        .se-input:focus { outline: 1px solid #4a90d9; border-color: transparent; }
        .se-primary-btn {
            width: 100%;
            padding: 7px;
            background: #1e3a5f;
            border: 1px solid #2d5a8e;
            border-radius: 4px;
            color: #7ab3e0;
            font-family: inherit;
            font-size: 12px;
            cursor: pointer;
            transition: background 0.1s;
        }
        .se-primary-btn:hover { background: #24486f; }
        .se-primary-btn:active { background: #1a3050; }
        .se-primary-btn:disabled { opacity: 0.4; cursor: default; background: #1e3a5f; }
        .se-danger-btn {
            width: 100%;
            padding: 6px;
            background: transparent;
            border: 1px solid #5a2020;
            border-radius: 4px;
            color: #c05050;
            font-family: inherit;
            font-size: 12px;
            cursor: pointer;
        }
        .se-danger-btn:hover { background: #2a1010; }
        .se-close-btn {
            background: none;
            border: none;
            color: #555;
            cursor: pointer;
            font-size: 11px;
            padding: 0;
            line-height: 1;
        }
        .se-close-btn:hover { color: #aaa; }
        .se-status {
            margin-top: 6px;
            font-size: 11px;
            min-height: 16px;
        }
        .se-file-input {
            width: 100%;
            font-family: inherit;
            font-size: 11px;
            color: #888;
            cursor: pointer;
        }
        .se-file-input::file-selector-button {
            background: #222;
            border: 1px solid #333;
            border-radius: 4px;
            color: #aaa;
            font-family: inherit;
            font-size: 11px;
            padding: 3px 8px;
            margin-right: 8px;
            cursor: pointer;
        }
        .se-file-input::file-selector-button:hover { background: #2a2a2a; }
        .se-row {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .se-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
        .se-dot-static  { background: #4a90d9; }
        .se-dot-dynamic { background: #d97b4a; }
        .se-dot-light   { background: #d9c44a; }
        .se-dot-material { background: #7a5fd9; }
    `;
    document.head.appendChild(style);
}

export abstract class DraggablePanel {
    protected panel: HTMLElement;
    private dragging = false;
    private dragOffsetX = 0;
    private dragOffsetY = 0;

    constructor(title: string, width: number, defaultTop: number, defaultRight: number) {
        injectSharedStyles();
        this.panel = document.createElement('div');
        this.panel.className = 'se-panel';
        this.panel.style.width = `${width}px`;
        this.panel.style.top = `${defaultTop}px`;
        this.panel.style.right = `${defaultRight}px`;
        this.panel.innerHTML = `
            <div class="se-header" data-drag-handle>
                <span class="se-title">${title}</span>
                <span class="se-grip">⠿</span>
            </div>
            <div class="se-body"></div>
        `;
        this.buildBody(this.panel.querySelector('.se-body')!);
        document.body.appendChild(this.panel);
        this.setupDrag();
    }

    protected abstract buildBody(container: HTMLElement): void;

    protected q<T extends HTMLElement>(selector: string): T {
        return this.panel.querySelector<T>(selector)!;
    }

    protected section(innerHTML: string): HTMLElement {
        const div = document.createElement('div');
        div.className = 'se-section';
        div.innerHTML = innerHTML;
        return div;
    }

    protected label(text: string): string {
        return `<div class="se-label">${text}</div>`;
    }

    protected xyzInputs(prefix: string, defaultX = 0, defaultY = 0, defaultZ = 0): string {
        return `
            <div class="se-xyz">
                <label>X <input type="number" id="${prefix}-x" value="${defaultX}" step="0.5"></label>
                <label>Y <input type="number" id="${prefix}-y" value="${defaultY}" step="0.5"></label>
                <label>Z <input type="number" id="${prefix}-z" value="${defaultZ}" step="0.5"></label>
            </div>
        `;
    }

    protected readXyz(prefix: string): [number, number, number] {
        const num = (id: string) =>
            parseFloat((this.panel.querySelector(`#${id}`) as HTMLInputElement).value) || 0;
        return [num(`${prefix}-x`), num(`${prefix}-y`), num(`${prefix}-z`)];
    }

    protected setXyz(prefix: string, x: number, y: number, z: number) {
        (this.panel.querySelector(`#${prefix}-x`) as HTMLInputElement).value = String(x);
        (this.panel.querySelector(`#${prefix}-y`) as HTMLInputElement).value = String(y);
        (this.panel.querySelector(`#${prefix}-z`) as HTMLInputElement).value = String(z);
    }

    protected debounce(fn: () => void, ms = 80): () => void {
        let timer: number | null = null;
        return () => {
            if (timer !== null) clearTimeout(timer);
            timer = window.setTimeout(fn, ms);
        };
    }

    protected materialSelect(id: string, includeDefault = true): string {
        return `<select class="se-select" id="${id}"></select>`;
    }

    protected syncMaterialSelect(selectId: string, materials: string[]) {
        const select = this.panel.querySelector(`#${selectId}`) as HTMLSelectElement;
        if (!select) return;
        const current = select.value;
        select.innerHTML = materials.map((m) => `<option value="${m}">${m}</option>`).join('');
        if (materials.includes(current)) select.value = current;
    }

    protected setStatus(el: HTMLElement, msg: string, ok: boolean) {
        el.textContent = msg;
        el.style.color = ok ? '#6a9f6a' : '#c05050';
    }

    private setupDrag() {
        const handle = this.panel.querySelector('[data-drag-handle]') as HTMLElement;
        handle.addEventListener('mousedown', (e) => {
            this.dragging = true;
            const rect = this.panel.getBoundingClientRect();
            this.dragOffsetX = e.clientX - rect.left;
            this.dragOffsetY = e.clientY - rect.top;

            if (!this.panel.style.left) {
                this.panel.style.left = `${rect.left}px`;
                this.panel.style.right = 'auto';
            }
            e.preventDefault();
        });
        document.addEventListener('mousemove', (e) => {
            if (!this.dragging) return;
            this.panel.style.left = `${e.clientX - this.dragOffsetX}px`;
            this.panel.style.top = `${e.clientY - this.dragOffsetY}px`;
        });
        document.addEventListener('mouseup', () => {
            this.dragging = false;
        });
    }
}
