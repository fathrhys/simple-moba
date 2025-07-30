// js/minion.js
import { TEAM } from './teams.js';

export default class Minion {
    constructor(x, y, team, path) {
        this.x = x; this.y = y; this.size = 10;
        this.team = team; this.color = team === TEAM.PLAYER ? '#2980b9' : '#c0392b';
        this.path = path; this.pathIndex = 0;
        this.speed = 100;
        this.maxHp = 150; this.hp = this.maxHp;
        this.damage = 15;
        this.attackRange = 100;
        this.attackCooldown = 1.5;
        this.lastAttackTime = 0;
        this.shouldBeRemoved = false;
        this.attackTarget = null;
    }

    findTarget(potentialTargets) {
        let closestTarget = null;
        let closestDistance = this.attackRange;

        for (const target of potentialTargets) {
            const dx = target.x - this.x;
            const dy = target.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < closestDistance) {
                closestDistance = distance;
                closestTarget = target;
            }
        }
        this.attackTarget = closestTarget;
    }

    takeDamage(damage, source) {
        this.hp -= damage;
        if (this.hp <= 0) {
            this.hp = 0;
            this.shouldBeRemoved = true;
            // Hanya beri hadiah jika pembunuhnya adalah tim musuh
            if (source && source.team !== this.team && source.grantReward) {
                source.grantReward('gold', 25);
                source.grantReward('xp', 40);
            }
        }
    }

    update(dt, potentialTargets, createParticle) {
        if (this.hp <= 0) return;

        this.findTarget(potentialTargets);

        if (this.attackTarget && this.attackTarget.hp > 0) {
            // Berhenti dan serang jika ada target dalam jangkauan
            const now = performance.now() / 1000;
            if (now > this.lastAttackTime + this.attackCooldown) {
                createParticle(this.x, this.y, 'minion_projectile', this.attackTarget, this.damage, this);
                this.lastAttackTime = now;
            }
        } else {
            // Jika tidak ada target, lanjutkan perjalanan
            if (this.pathIndex < this.path.length) {
                const targetPoint = this.path[this.pathIndex];
                const dx = targetPoint.x - this.x;
                const dy = targetPoint.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < 5) {
                    this.pathIndex++;
                } else {
                    this.x += (dx / distance) * this.speed * dt;
                    this.y += (dy / distance) * this.speed * dt;
                }
            } else {
                // Jika sudah sampai ujung path, serang tower terdekat atau entitas musuh
                this.findTarget(potentialTargets.filter(t => t.constructor.name === "Tower"));
            }
        }
    }

    draw(ctx) {
        if (this.hp <= 0) return;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();

        // Health bar
        const barW = 30, barH = 5;
        ctx.fillStyle = '#c0392b';
        ctx.fillRect(this.x - barW / 2, this.y - this.size - barH - 2, barW, barH);
        ctx.fillStyle = '#2ecc71';
        ctx.fillRect(this.x - barW / 2, this.y - this.size - barH - 2, barW * (this.hp / this.maxHp), barH);
    }
}