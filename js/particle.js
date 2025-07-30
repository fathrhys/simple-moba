// js/particle.js
export default class Particle {
    constructor(x, y, type, target = null, damage = 0, owner = null) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.target = target;
        this.damage = damage;
        this.owner = owner; // Menyimpan siapa yang menembakkan proyektil ini

        if (type === 'projectile' || type === 'ultimate_projectile') {
            this.speed = (type === 'ultimate_projectile') ? 600 : 400;
            this.size = (type === 'ultimate_projectile') ? 15 : 5;
            this.color = (type === 'ultimate_projectile') ? '#f1c40f' : '#ffffff';
        } else if (type === 'hit_spark') {
            this.size = Math.random() * 3 + 1;
            this.color = 'orange';
            this.lifetime = 0.2;
            this.velX = (Math.random() - 0.5) * 150;
            this.velY = (Math.random() - 0.5) * 150;
        }
        
        this.shouldBeRemoved = false;
    }

    update(dt) {
        if (this.type === 'projectile' || this.type === 'ultimate_projectile') {
            if (!this.target || this.target.hp <= 0) {
                this.shouldBeRemoved = true;
                return;
            }
            const dx = this.target.x - this.x;
            const dy = this.target.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 10) {
                // Saat mengenai target, berikan damage dan beritahu siapa yang membunuh
                this.target.takeDamage(this.damage, this.owner); 
                this.shouldBeRemoved = true;
            } else {
                this.x += (dx / distance) * this.speed * dt;
                this.y += (dy / distance) * this.speed * dt;
            }
        } else if (this.type === 'hit_spark') {
            this.x += this.velX * dt;
            this.y += this.velY * dt;
            this.lifetime -= dt;
            if (this.lifetime <= 0) {
                this.shouldBeRemoved = true;
            }
        }
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}