// js/camera.js
export default class Camera {
    constructor(canvas, worldWidth, worldHeight) {
        this.canvas = canvas;
        this.worldWidth = worldWidth;
        this.worldHeight = worldHeight;
        this.x = 0;
        this.y = 0;
    }

    update(target) {
        this.x = target.x - this.canvas.width / 2;
        this.y = target.y - this.canvas.height / 2;

        // Batasi kamera agar tidak keluar dari dunia
        this.x = Math.max(0, Math.min(this.x, this.worldWidth - this.canvas.width));
        this.y = Math.max(0, Math.min(this.y, this.worldHeight - this.canvas.height));
    }

    apply(ctx) {
        ctx.translate(-this.x, -this.y);
    }

    reset(ctx) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
}