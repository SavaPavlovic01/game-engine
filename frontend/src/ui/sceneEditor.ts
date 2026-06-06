import type { Game } from '../game';
import { MaterialId } from '../graphics/materials/material';
import { Quat } from '../graphics/math/quat';
import { Vec3 } from '../graphics/math/vec';
import type { Model } from '../graphics/model';
import { Cube } from '../graphics/objects/cube';
import { Ramp } from '../graphics/objects/ramp';
import { ObjLoader, ObjModel } from '../graphics/objects/objLoader.js'; // adjust path

type ObjectType = 'cube-static' | 'cube-dynamic' | 'ramp-static';

interface HierarchyEntry {
    name: string;
    type: 'static' | 'dynamic' | 'light';
    model: Model;
}

export class SceneEditor {
    private game: Game;
    private panel: HTMLElement;
    private selectedType: ObjectType = 'cube-static';
    private hierarchy: HierarchyEntry[] = [];
    private hierarchyList!: HTMLElement;
    private inspectorSection!: HTMLElement;
    private selectedEntry: HierarchyEntry | null = null;
    private debounceTimer: number | null = null;

    private dragging = false;
    private dragOffsetX = 0;
    private dragOffsetY = 0;

    constructor(game: Game) {
        this.game = game;
        this.panel = this.buildPanel();
        document.body.appendChild(this.panel);
        this.setupDrag();
    }

    // ── public API ───────────────────────────────────────────────

    addToHierarchy(name: string, type: HierarchyEntry['type'], model: Model) {
        this.hierarchy.push({ name, type, model });
        this.renderHierarchy();
    }

    registerMaterial(name: string) {
        const selectors = ['#se-material', '#se-obj-material'];
        selectors.forEach((sel) => {
            const select = this.panel.querySelector(sel) as HTMLSelectElement;
            if (select && !Array.from(select.options).some((o) => o.value === name)) {
                const opt = document.createElement('option');
                opt.value = name;
                opt.textContent = name;
                select.appendChild(opt);
            }
        });
    }

    // ── panel construction ───────────────────────────────────────

    private buildPanel(): HTMLElement {
        const panel = document.createElement('div');
        panel.id = 'scene-editor';
        panel.innerHTML = `
            <div class="se-header" id="se-drag-handle">
                <span class="se-title">Scene Editor</span>
                <span class="se-grip">⠿</span>
            </div>

            <div class="se-section">
                <div class="se-section-label">Add object</div>
                <div class="se-btn-group">
                    <button class="se-type-btn se-active" data-type="cube-static">
                        <span class="se-dot se-dot-static"></span> Cube <em>static</em>
                    </button>
                    <button class="se-type-btn" data-type="ramp-static">
                        <span class="se-dot se-dot-static"></span> Ramp <em>static</em>
                    </button>
                    <button class="se-type-btn" data-type="cube-dynamic">
                        <span class="se-dot se-dot-dynamic"></span> Cube <em>dynamic</em>
                    </button>
                </div>
            </div>

            <div class="se-section">
                <div class="se-section-label">Material</div>
                <select class="se-select" id="se-material">
                    <option value="${MaterialId.Default}">Default</option>
                </select>
            </div>

            <div class="se-section">
                <div class="se-section-label">Position</div>
                <div class="se-xyz">
                    <label>X <input type="number" id="se-px" value="0" step="1"></label>
                    <label>Y <input type="number" id="se-py" value="0" step="1"></label>
                    <label>Z <input type="number" id="se-pz" value="0" step="1"></label>
                </div>
                <div class="se-section-label" style="margin-top:8px;">Scale</div>
                <div class="se-xyz">
                    <label>X <input type="number" id="se-sx" value="1" step="0.5"></label>
                    <label>Y <input type="number" id="se-sy" value="1" step="0.5"></label>
                    <label>Z <input type="number" id="se-sz" value="1" step="0.5"></label>
                </div>
            </div>

            <div class="se-section">
                <button class="se-add-btn" id="se-add">Add to scene</button>
            </div>

            <div class="se-section">
                <div class="se-section-label">Load OBJ</div>
                <input type="file" id="se-obj-file" accept=".obj" class="se-file-input">
                <div class="se-section-label" style="margin-top:8px;">Fallback material</div>
                <select class="se-select" id="se-obj-material">
                    <option value="${MaterialId.Default}">Default</option>
                </select>
                <button class="se-add-btn" id="se-obj-load" style="margin-top:8px;" disabled>Load into scene</button>
                <div class="se-obj-status" id="se-obj-status"></div>
            </div>

            <div class="se-section se-hierarchy-section">
                <div class="se-section-label">Hierarchy</div>
                <div class="se-hierarchy" id="se-hierarchy-list"></div>
            </div>

            <div class="se-section se-inspector" id="se-inspector" style="display:none;">
                <div class="se-inspector-header">
                    <span class="se-section-label" id="se-inspector-title">Inspector</span>
                    <button class="se-close-btn" id="se-inspector-close">✕</button>
                </div>
                <div class="se-section-label" style="margin-top:6px;">Position</div>
                <div class="se-xyz">
                    <label>X <input type="number" id="se-ip-x" step="0.5"></label>
                    <label>Y <input type="number" id="se-ip-y" step="0.5"></label>
                    <label>Z <input type="number" id="se-ip-z" step="0.5"></label>
                </div>
                <div class="se-section-label" style="margin-top:8px;">Scale</div>
                <div class="se-xyz">
                    <label>X <input type="number" id="se-is-x" step="0.5"></label>
                    <label>Y <input type="number" id="se-is-y" step="0.5"></label>
                    <label>Z <input type="number" id="se-is-z" step="0.5"></label>
                </div>
                <div class="se-inspector-actions">
                    <button class="se-remove-btn" id="se-remove">Remove</button>
                </div>
            </div>
        `;

        const style = document.createElement('style');
        style.textContent = this.css();
        document.head.appendChild(style);

        // type buttons
        panel.querySelectorAll<HTMLButtonElement>('.se-type-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                panel
                    .querySelectorAll('.se-type-btn')
                    .forEach((b) => b.classList.remove('se-active'));
                btn.classList.add('se-active');
                this.selectedType = btn.dataset.type as ObjectType;
            });
        });

        // add primitive
        panel.querySelector('#se-add')!.addEventListener('click', () => this.addObject());

        // OBJ loading
        const fileInput = panel.querySelector('#se-obj-file') as HTMLInputElement;
        const loadBtn = panel.querySelector('#se-obj-load') as HTMLButtonElement;
        const status = panel.querySelector('#se-obj-status') as HTMLElement;

        let pendingObjSrc: string | null = null;
        let pendingObjName = 'Model';

        fileInput.addEventListener('change', () => {
            const file = fileInput.files?.[0];
            if (!file) return;
            pendingObjName = file.name.replace(/\.obj$/i, '');
            const reader = new FileReader();
            reader.onload = (e) => {
                pendingObjSrc = e.target?.result as string;
                loadBtn.disabled = false;
                status.textContent = `✓ ${file.name}`;
                status.style.color = '#6a9f6a';
            };
            reader.onerror = () => {
                status.textContent = '✗ Failed to read file';
                status.style.color = '#c05050';
                loadBtn.disabled = true;
            };
            reader.readAsText(file);
        });

        loadBtn.addEventListener('click', () => {
            if (!pendingObjSrc) return;

            const { position, scale } = this.readAddTransform();
            const mat = (panel.querySelector('#se-obj-material') as HTMLSelectElement).value;

            try {
                const { parts, aabb } = ObjLoader.load(pendingObjSrc, [], mat);
                const model = new ObjModel(parts, aabb, position, Quat.identity(), scale);
                this.game.gameState.addStaticModel(model);
                this.addToHierarchy(pendingObjName, 'static', model);

                status.textContent = `✓ Added "${pendingObjName}"`;
                status.style.color = '#6a9f6a';
                loadBtn.disabled = true;
                fileInput.value = '';
                pendingObjSrc = null;
            } catch (e) {
                status.textContent = '✗ Parse error — check console';
                status.style.color = '#c05050';
                console.error('OBJ load failed:', e);
            }
        });

        // inspector position inputs
        ['se-ip-x', 'se-ip-y', 'se-ip-z'].forEach((id) => {
            panel.querySelector(`#${id}`)!.addEventListener('input', () => this.onPositionInput());
        });

        // inspector scale inputs
        ['se-is-x', 'se-is-y', 'se-is-z'].forEach((id) => {
            panel.querySelector(`#${id}`)!.addEventListener('input', () => this.onScaleInput());
        });

        panel
            .querySelector('#se-inspector-close')!
            .addEventListener('click', () => this.closeInspector());
        panel.querySelector('#se-remove')!.addEventListener('click', () => this.removeSelected());

        this.hierarchyList = panel.querySelector('#se-hierarchy-list')!;
        this.inspectorSection = panel.querySelector('#se-inspector')!;
        return panel;
    }

    // ── inspector ────────────────────────────────────────────────

    private openInspector(entry: HierarchyEntry) {
        this.selectedEntry = entry;

        (this.panel.querySelector('#se-inspector-title') as HTMLElement).textContent = entry.name;

        const pos = entry.model.translation;
        const scale = entry.model.scale;

        this.setInspectorVec('se-ip', pos);
        this.setInspectorVec('se-is', scale);

        this.inspectorSection.style.display = 'block';
        this.renderHierarchy();
    }

    private closeInspector() {
        this.selectedEntry = null;
        this.inspectorSection.style.display = 'none';
        this.renderHierarchy();
    }

    private setInspectorVec(prefix: string, vec: Vec3) {
        (this.panel.querySelector(`#${prefix}-x`) as HTMLInputElement).value = String(vec.x);
        (this.panel.querySelector(`#${prefix}-y`) as HTMLInputElement).value = String(vec.y);
        (this.panel.querySelector(`#${prefix}-z`) as HTMLInputElement).value = String(vec.z);
    }

    private getInspectorVec(prefix: string): Vec3 {
        const num = (id: string) =>
            parseFloat((this.panel.querySelector(`#${id}`) as HTMLInputElement).value) || 0;
        return new Vec3(num(`${prefix}-x`), num(`${prefix}-y`), num(`${prefix}-z`));
    }

    private onPositionInput() {
        if (!this.selectedEntry) return;
        if (this.debounceTimer !== null) clearTimeout(this.debounceTimer);
        this.debounceTimer = window.setTimeout(() => {
            if (!this.selectedEntry) return;
            const pos = this.getInspectorVec('se-ip');
            this.game.gameState.moveModel(this.selectedEntry.model, pos);
        }, 80);
    }

    private onScaleInput() {
        if (!this.selectedEntry) return;
        if (this.debounceTimer !== null) clearTimeout(this.debounceTimer);
        this.debounceTimer = window.setTimeout(() => {
            if (!this.selectedEntry) return;
            const scale = this.getInspectorVec('se-is');
            // wire up once you add setScale to gameState:
            // this.game.gameState.setScale(this.selectedEntry.model, scale);
            console.log('setScale not yet implemented on gameState', scale);
        }, 80);
    }

    private removeSelected() {
        if (!this.selectedEntry) return;
        this.game.gameState.removeModel(this.selectedEntry.model);
        this.hierarchy = this.hierarchy.filter((e) => e !== this.selectedEntry);
        this.closeInspector();
    }

    // ── add primitive ────────────────────────────────────────────

    private readAddTransform(): { position: Vec3; scale: Vec3 } {
        const num = (id: string) =>
            parseFloat((this.panel.querySelector(`#${id}`) as HTMLInputElement).value) || 0;
        return {
            position: new Vec3(num('se-px'), num('se-py'), num('se-pz')),
            scale: new Vec3(num('se-sx') || 1, num('se-sy') || 1, num('se-sz') || 1),
        };
    }

    private addObject() {
        const { position, scale } = this.readAddTransform();
        const mat = (this.panel.querySelector('#se-material') as HTMLSelectElement).value;

        switch (this.selectedType) {
            case 'cube-static': {
                const obj = new Cube(mat, position, Quat.identity(), scale);
                this.game.gameState.addStaticModel(obj);
                this.addToHierarchy('Cube', 'static', obj);
                break;
            }
            case 'ramp-static': {
                const obj = new Ramp(mat, position, Quat.identity(), scale);
                this.game.gameState.addStaticModel(obj);
                this.addToHierarchy('Ramp', 'static', obj);
                break;
            }
            case 'cube-dynamic': {
                const obj = new Cube(mat, position, Quat.identity(), scale);
                this.game.gameState.addDynamicModel(obj, {
                    mass: 10,
                    restitution: 0.1,
                    friction: 0.6,
                    linearDamping: 0.1,
                    angularDamping: 0.9,
                });
                this.addToHierarchy('Cube', 'dynamic', obj);
                break;
            }
        }
    }

    // ── hierarchy ────────────────────────────────────────────────

    private renderHierarchy() {
        this.hierarchyList.innerHTML = '';
        this.hierarchy.forEach((entry) => {
            const item = document.createElement('div');
            item.className = 'se-h-item' + (entry === this.selectedEntry ? ' se-h-selected' : '');
            item.innerHTML = `
                <span class="se-dot se-dot-${entry.type}"></span>
                <span class="se-h-name">${entry.name}</span>
                <span class="se-h-tag">${entry.type}</span>
            `;
            item.addEventListener('click', () => {
                if (this.selectedEntry === entry) {
                    this.closeInspector();
                } else {
                    this.openInspector(entry);
                }
            });
            this.hierarchyList.appendChild(item);
        });
    }

    // ── drag ─────────────────────────────────────────────────────

    private setupDrag() {
        const handle = this.panel.querySelector('#se-drag-handle') as HTMLElement;
        handle.addEventListener('mousedown', (e) => {
            this.dragging = true;
            const rect = this.panel.getBoundingClientRect();
            this.dragOffsetX = e.clientX - rect.left;
            this.dragOffsetY = e.clientY - rect.top;
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

    // ── css ──────────────────────────────────────────────────────

    private css(): string {
        return `
            #scene-editor {
                position: fixed;
                top: 80px;
                right: 16px;
                width: 240px;
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
            .se-section-label {
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
            .se-add-btn {
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
            .se-add-btn:hover { background: #24486f; }
            .se-add-btn:active { background: #1a3050; }
            .se-add-btn:disabled {
                opacity: 0.4;
                cursor: default;
                background: #1e3a5f;
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
            .se-obj-status {
                margin-top: 6px;
                font-size: 11px;
                min-height: 16px;
            }
            .se-hierarchy { display: flex; flex-direction: column; max-height: 160px; overflow-y: auto; }
            .se-hierarchy::-webkit-scrollbar { width: 4px; }
            .se-hierarchy::-webkit-scrollbar-track { background: transparent; }
            .se-hierarchy::-webkit-scrollbar-thumb { background: #333; border-radius: 2px; }
            .se-h-item {
                display: flex;
                align-items: center;
                gap: 6px;
                padding: 4px 2px;
                border-radius: 3px;
                cursor: pointer;
            }
            .se-h-item:hover { background: #222; }
            .se-h-item.se-h-selected { background: #1e3a5f; }
            .se-h-name { flex: 1; }
            .se-h-tag { font-size: 10px; color: #555; }
            .se-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
            .se-dot-static  { background: #4a90d9; }
            .se-dot-dynamic { background: #d97b4a; }
            .se-dot-light   { background: #d9c44a; }
            .se-inspector { background: #161616; }
            .se-inspector-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
            }
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
            .se-inspector-actions { margin-top: 10px; }
            .se-remove-btn {
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
            .se-remove-btn:hover { background: #2a1010; }
        `;
    }
}
