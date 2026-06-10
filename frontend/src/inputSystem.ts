export class Input {
    private held = new Set<string>();
    private justPressed = new Set<string>();

    constructor() {
        window.addEventListener('keydown', (e) => {
            if (!this.held.has(e.key)) this.justPressed.add(e.key);
            this.held.add(e.key);
        });
        window.addEventListener('keyup', (e) => {
            this.held.delete(e.key);
        });
    }

    isKeyDown(key: string): boolean {
        return this.held.has(key);
    }

    isKeyPressed(key: string): boolean {
        return this.justPressed.has(key);
    }

    flush() {
        this.justPressed.clear();
    }
}
