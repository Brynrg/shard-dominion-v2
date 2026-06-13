// Core game system - manages Phaser scene, entities, and game state
export class Game {
  private ctx: CanvasRenderingContext2D | null = null;
  private width = 800;
  private height = 600;
  private running = false;
  private lastTime = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d');
    if (!this.ctx) throw new Error('Could not get 2D rendering context');
  }

  start(): void {
    this.running = true;
    this.lastTime = performance.now();
    this.gameLoop();
  }

  stop(): void {
    this.running = false;
  }

  private gameLoop(): void {
    if (!this.running) return;

    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    this.update(deltaTime);
    this.render();

    requestAnimationFrame(() => this.gameLoop());
  }

  update(_deltaTime: number): void {
    // Placeholder: will update game systems and entities
  }

  render(): void {
    if (!this.ctx) return;
    
    // Placeholder: will render game scene
    this.ctx.fillStyle = '#1a1a2e';
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  onDraw(_callback: (ctx: CanvasRenderingContext2D, width: number, height: number) => void): void {
    // Placeholder for custom drawing callback
  }
}