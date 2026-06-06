import { Game } from '../game.js';
import { DraggablePanel, MaterialRegistry } from './editorCore.js';

export class MaterialEditor extends DraggablePanel {
    private game: Game;

    constructor(game: Game) {
        super('Material Editor', 240, 80, 272);
        this.game = game;
    }

    protected buildBody(container: HTMLElement) {
        const nameSection = this.section(`
            ${this.label('Material ID')}
            <input class="se-input" id="mat-id" type="text" placeholder="e.g. brick, metal, wood">
        `);

        const colorSection = this.section(`
            ${this.label('Base color (RGB 0–1)')}
            ${this.xyzInputs('mat-color', 1, 1, 1)}
        `);

        const pbrSection = this.section(`
            ${this.label('Metallic')}
            <div class="se-row">
                <input type="range" id="mat-metallic" min="0" max="1" step="0.01" value="0.0" style="flex:1;">
                <span id="mat-metallic-val" style="width:28px;text-align:right;font-size:11px;color:#888;">0.0</span>
            </div>
            ${this.label('Roughness')}
            <div class="se-row" style="margin-top:4px;">
                <input type="range" id="mat-roughness" min="0" max="1" step="0.01" value="0.5" style="flex:1;">
                <span id="mat-roughness-val" style="width:28px;text-align:right;font-size:11px;color:#888;">0.5</span>
            </div>
        `);

        const textureSection = this.section(`
            ${this.label('Texture (optional)')}
            <input type="file" id="mat-texture" accept="image/*" class="se-file-input">
            <div class="se-status" id="mat-texture-status"></div>
        `);

        const createSection = this.section(`
            <div class="se-row" style="margin-bottom:8px;">
                <div id="mat-swatch" style="
                    width:32px; height:32px; border-radius:4px; border:1px solid #333;
                    background: rgb(255,255,255); flex-shrink:0;
                "></div>
                <div style="flex:1;font-size:11px;color:#666;line-height:1.5;">
                    Preview swatch<br>
                    <span id="mat-preview-label" style="color:#888;">default</span>
                </div>
            </div>
            <button class="se-primary-btn" id="mat-create">Create material</button>
            <div class="se-status" id="mat-create-status"></div>
        `);

        const listSection = this.section(`
            ${this.label('Registered materials')}
            <div id="mat-list" style="display:flex;flex-direction:column;gap:3px;max-height:140px;overflow-y:auto;"></div>
        `);
        listSection.querySelector<HTMLElement>('#mat-list')!.style.cssText +=
            'scrollbar-width:thin;scrollbar-color:#333 transparent;';

        container.append(
            nameSection,
            colorSection,
            pbrSection,
            textureSection,
            createSection,
            listSection,
        );

        this.wireSlider('mat-metallic', 'mat-metallic-val');
        this.wireSlider('mat-roughness', 'mat-roughness-val');
        this.wireColorPreview();

        let pendingTexture: GPUTexture | undefined;

        const textureInput = this.q<HTMLInputElement>('#mat-texture');
        const textureStatus = this.q<HTMLElement>('#mat-texture-status');

        textureInput.addEventListener('change', async () => {
            const file = textureInput.files?.[0];
            if (!file) return;
            try {
                pendingTexture = await this.game.renderer.materials.loadTexture(
                    URL.createObjectURL(file),
                );
                this.setStatus(textureStatus, `✓ ${file.name}`, true);
            } catch {
                this.setStatus(textureStatus, '✗ Failed to load texture', false);
                pendingTexture = undefined;
            }
        });

        const createBtn = this.q<HTMLButtonElement>('#mat-create');
        const createStatus = this.q<HTMLElement>('#mat-create-status');

        createBtn.addEventListener('click', () => {
            const id = (this.q<HTMLInputElement>('#mat-id').value ?? '').trim();
            if (!id) {
                this.setStatus(createStatus, '✗ Material ID is required', false);
                return;
            }

            const [r, g, b] = this.readXyz('mat-color');
            const metallic = parseFloat(this.q<HTMLInputElement>('#mat-metallic').value);
            const roughness = parseFloat(this.q<HTMLInputElement>('#mat-roughness').value);

            try {
                this.game.renderer.materials.register(
                    id,
                    { baseColor: [r, g, b], metallic, roughness },
                    pendingTexture,
                );
                MaterialRegistry.register(id);
                this.renderMaterialList();
                this.setStatus(createStatus, `✓ Created "${id}"`, true);

                this.q<HTMLInputElement>('#mat-id').value = '';
                textureInput.value = '';
                textureStatus.textContent = '';
                pendingTexture = undefined;
            } catch (e) {
                this.setStatus(createStatus, '✗ Failed — check console', false);
                console.error('Material create failed:', e);
            }
        });

        this.renderMaterialList();
    }

    private wireSlider(sliderId: string, labelId: string) {
        const slider = this.q<HTMLInputElement>(`#${sliderId}`);
        const label = this.q<HTMLElement>(`#${labelId}`);
        const update = () => {
            label.textContent = parseFloat(slider.value).toFixed(2);
            this.updateSwatch();
        };
        slider.addEventListener('input', update);
    }

    private wireColorPreview() {
        ['mat-color-x', 'mat-color-y', 'mat-color-z'].forEach((id) => {
            this.q<HTMLInputElement>(`#${id}`).addEventListener('input', () => this.updateSwatch());
        });
    }

    private updateSwatch() {
        const [r, g, b] = this.readXyz('mat-color');
        const metallic = parseFloat(this.q<HTMLInputElement>('#mat-metallic').value);
        const roughness = parseFloat(this.q<HTMLInputElement>('#mat-roughness').value);

        const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
        const grey = (r + g + b) / 3;
        const mr = lerp(r, grey, metallic) * (1 - roughness * 0.3);
        const mg = lerp(g, grey, metallic) * (1 - roughness * 0.3);
        const mb = lerp(b, grey, metallic) * (1 - roughness * 0.3);

        const toU8 = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 255);
        this.q<HTMLElement>('#mat-swatch').style.background =
            `rgb(${toU8(mr)},${toU8(mg)},${toU8(mb)})`;

        const id = (this.q<HTMLInputElement>('#mat-id').value ?? '').trim() || 'unnamed';
        this.q<HTMLElement>('#mat-preview-label').textContent = id;
    }

    private renderMaterialList() {
        const list = this.q<HTMLElement>('#mat-list');
        const materials = MaterialRegistry.getAll();
        if (materials.length === 0) {
            list.innerHTML = `<div style="font-size:11px;color:#555;padding:2px 0;">No materials yet</div>`;
            return;
        }
        list.innerHTML = materials
            .map(
                (id) => `
            <div style="display:flex;align-items:center;gap:6px;padding:3px 2px;">
                <span class="se-dot se-dot-material"></span>
                <span style="flex:1;font-size:12px;">${id}</span>
            </div>
        `,
            )
            .join('');
    }
}
