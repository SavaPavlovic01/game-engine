// ─────────────────────────────────────────────────────────────────────────────
// sceneEditor.ts
// Panel for adding objects to the scene and editing their transforms.
// ─────────────────────────────────────────────────────────────────────────────

import { Game } from '../game.js';
import { Cube } from '../graphics/objects/cube.js';
import { Ramp } from '../graphics/objects/ramp.js';
import { ObjLoader, ObjModel } from '../graphics/objects/objLoader.js';
import { MaterialId } from '../graphics/materials/material.js';
import { Quat } from '../graphics/math/quat.js';
import { Vec3 } from '../graphics/math/vec.js';
import { Model } from '../graphics/model.js';
import { DraggablePanel, MaterialRegistry } from './editorCore.js';

type ObjectType = 'cube-static' | 'cube-dynamic' | 'ramp-static';

interface HierarchyEntry {
    name: string;
    type: 'static' | 'dynamic' | 'light';
    model: Model;
}

export class SceneEditor extends DraggablePanel {
    private game: Game;
    private selectedType: ObjectType = 'cube-static';
    private hierarchy: HierarchyEntry[] = [];
    private selectedEntry: HierarchyEntry | null = null;

    private onPositionInputDebounced!: () => void;
    private onScaleInputDebounced!: () => void;

    constructor(game: Game) {
        super('Scene Editor', 240, 80, 16);
        this.game = game;

        MaterialRegistry.onChange((materials) => {
            this.syncMaterialSelect('se-material', materials);
            this.syncMaterialSelect('se-obj-material', materials);
        });

        this.syncMaterialSelect('se-material', MaterialRegistry.getAll());
        this.syncMaterialSelect('se-obj-material', MaterialRegistry.getAll());
    }

    addToHierarchy(name: string, type: HierarchyEntry['type'], model: Model) {
        this.hierarchy.push({ name, type, model });
        this.renderHierarchy();
    }

    protected buildBody(container: HTMLElement) {
        const typeSection = this.section(`
            ${this.label('Add object')}
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
        `);

        const matSection = this.section(`
            ${this.label('Material')}
            ${this.materialSelect('se-material')}
        `);

        const transformSection = this.section(`
            ${this.label('Position')}
            ${this.xyzInputs('se-px', 0, 0, 0)}
            ${this.label('Scale')}
            ${this.xyzInputs('se-sx', 1, 1, 1)}
        `);
        transformSection.querySelectorAll<HTMLElement>('.se-label')[1]!.style.marginTop = '8px';

        const addSection = this.section(`
            <button class="se-primary-btn" id="se-add">Add to scene</button>
        `);

        const objSection = this.section(`
            ${this.label('Load OBJ')}
            <input type="file" id="se-obj-file" accept=".obj" class="se-file-input">
            ${this.label('Fallback material')}
            ${this.materialSelect('se-obj-material')}
            <button class="se-primary-btn" id="se-obj-load" style="margin-top:8px;" disabled>Load into scene</button>
            <div class="se-status" id="se-obj-status"></div>
        `);
        objSection.querySelectorAll<HTMLElement>('.se-label')[1]!.style.marginTop = '8px';

        const hierarchySection = this.section(`
            ${this.label('Hierarchy')}
            <div id="se-hierarchy-list" style="
                display:flex;flex-direction:column;max-height:160px;overflow-y:auto;
                scrollbar-width:thin;scrollbar-color:#333 transparent;
            "></div>
        `);

        const inspectorSection = this.section(`
            <div class="se-row" style="margin-bottom:6px;">
                <span class="se-label" id="se-inspector-title" style="margin:0;flex:1;">Inspector</span>
                <button class="se-close-btn" id="se-inspector-close">✕</button>
            </div>
            ${this.label('Position')}
            ${this.xyzInputs('se-ip', 0, 0, 0)}
            ${this.label('Scale')}
            ${this.xyzInputs('se-is', 1, 1, 1)}
            <div style="margin-top:10px;">
                <button class="se-danger-btn" id="se-remove">Remove</button>
            </div>
        `);
        inspectorSection.querySelectorAll<HTMLElement>('.se-label')[1]!.style.marginTop = '8px';
        inspectorSection.style.background = '#161616';
        inspectorSection.style.display = 'none';
        inspectorSection.id = 'se-inspector-section';

        container.append(
            typeSection,
            matSection,
            transformSection,
            addSection,
            objSection,
            hierarchySection,
            inspectorSection,
        );

        typeSection.querySelectorAll<HTMLButtonElement>('.se-type-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                typeSection
                    .querySelectorAll('.se-type-btn')
                    .forEach((b) => b.classList.remove('se-active'));
                btn.classList.add('se-active');
                this.selectedType = btn.dataset.type as ObjectType;
            });
        });

        container.querySelector('#se-add')!.addEventListener('click', () => this.addObject());

        this.wireObjLoader(container);

        this.onPositionInputDebounced = this.debounce(() => {
            if (!this.selectedEntry) return;
            const [x, y, z] = this.readXyz('se-ip');
            this.game.gameState.moveModel(this.selectedEntry.model, new Vec3(x, y, z));
        });

        this.onScaleInputDebounced = this.debounce(() => {
            if (!this.selectedEntry) return;
            const [x, y, z] = this.readXyz('se-is');
            // this.game.gameState.setScale(this.selectedEntry.model, new Vec3(x, y, z));
            console.log('setScale not yet implemented on gameState', x, y, z);
        });

        ['se-ip-x', 'se-ip-y', 'se-ip-z'].forEach((id) => {
            this.panel
                .querySelector(`#${id}`)!
                .addEventListener('input', this.onPositionInputDebounced);
        });
        ['se-is-x', 'se-is-y', 'se-is-z'].forEach((id) => {
            this.panel
                .querySelector(`#${id}`)!
                .addEventListener('input', this.onScaleInputDebounced);
        });

        container
            .querySelector('#se-inspector-close')!
            .addEventListener('click', () => this.closeInspector());
        container
            .querySelector('#se-remove')!
            .addEventListener('click', () => this.removeSelected());
    }

    private wireObjLoader(container: HTMLElement) {
        const fileInput = container.querySelector<HTMLInputElement>('#se-obj-file')!;
        const loadBtn = container.querySelector<HTMLButtonElement>('#se-obj-load')!;
        const status = container.querySelector<HTMLElement>('#se-obj-status')!;

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
                this.setStatus(status, `✓ ${file.name}`, true);
            };
            reader.onerror = () => {
                this.setStatus(status, '✗ Failed to read file', false);
                loadBtn.disabled = true;
            };
            reader.readAsText(file);
        });

        loadBtn.addEventListener('click', () => {
            if (!pendingObjSrc) return;
            const [px, py, pz] = this.readXyz('se-px');
            const [sx, sy, sz] = this.readXyz('se-sx');
            const mat = this.q<HTMLSelectElement>('#se-obj-material').value;

            try {
                const { parts, aabb } = ObjLoader.load(pendingObjSrc, [], mat);
                const model = new ObjModel(
                    parts,
                    aabb,
                    new Vec3(px, py, pz),
                    Quat.identity(),
                    new Vec3(sx || 1, sy || 1, sz || 1),
                );
                this.game.gameState.addStaticModel(model);
                this.addToHierarchy(pendingObjName, 'static', model);
                this.setStatus(status, `✓ Added "${pendingObjName}"`, true);
                loadBtn.disabled = true;
                fileInput.value = '';
                pendingObjSrc = null;
            } catch (e) {
                this.setStatus(status, '✗ Parse error — check console', false);
                console.error('OBJ load failed:', e);
            }
        });
    }

    private openInspector(entry: HierarchyEntry) {
        this.selectedEntry = entry;
        this.q<HTMLElement>('#se-inspector-title').textContent = entry.name;

        const pos = entry.model.translation;
        const scale = entry.model.scale;
        this.setXyz('se-ip', pos.X, pos.Y, pos.Z);
        this.setXyz('se-is', scale.X, scale.Y, scale.Z);

        this.q<HTMLElement>('#se-inspector-section').style.display = 'block';
        this.renderHierarchy();
    }

    private closeInspector() {
        this.selectedEntry = null;
        this.q<HTMLElement>('#se-inspector-section').style.display = 'none';
        this.renderHierarchy();
    }

    private removeSelected() {
        if (!this.selectedEntry) return;
        this.game.gameState.removeModel(this.selectedEntry.model);
        this.hierarchy = this.hierarchy.filter((e) => e !== this.selectedEntry);
        this.closeInspector();
    }

    private addObject() {
        const [px, py, pz] = this.readXyz('se-px');
        const [sx, sy, sz] = this.readXyz('se-sx');
        const position = new Vec3(px, py, pz);
        const scale = new Vec3(sx || 1, sy || 1, sz || 1);
        const mat = this.q<HTMLSelectElement>('#se-material').value || MaterialId.Default;

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

    private renderHierarchy() {
        const list = this.q<HTMLElement>('#se-hierarchy-list');
        if (!list) return;
        list.innerHTML = '';
        this.hierarchy.forEach((entry) => {
            const item = document.createElement('div');
            item.style.cssText =
                'display:flex;align-items:center;gap:6px;padding:4px 2px;border-radius:3px;cursor:pointer;';
            if (entry === this.selectedEntry) item.style.background = '#1e3a5f';
            item.innerHTML = `
            <span class="se-dot se-dot-${entry.type}"></span>
            <span style="flex:1;">${entry.name}</span>
            <span style="font-size:10px;color:#555;">${entry.type}</span>
        `;
            item.addEventListener('mouseover', () => {
                if (entry !== this.selectedEntry) item.style.background = '#222';
            });
            item.addEventListener('mouseout', () => {
                if (entry !== this.selectedEntry) item.style.background = '';
            });
            item.addEventListener('click', () => {
                if (this.selectedEntry === entry) this.closeInspector();
                else this.openInspector(entry);
            });
            list.appendChild(item);
        });
    }
}
