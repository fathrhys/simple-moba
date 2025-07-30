// js/tower.js
import { TEAM } from './teams.js'; // <-- BARIS INI YANG HILANG DAN KRUSIAL

export default class Tower {
    constructor(x, y, team) {
        this.x = x; this.y = y; this.size = 35;
        this.team = team;
        this.color = (team === TEAM.PLAYER) ? '#3498db' : '#e74c3c'; // Biru untuk Player, Merah untuk Enemy
        this.hp = 1500; this.maxHp = 1500;
        this.attackRange = 250; this.attackDamage = 25;
        this.attackCooldown = 2; this.lastAttackTime = 0;
        this.target = null; this.goldValue = 200;
    }

    takeDamage(damage, killer) {
        this.hp -= damage;
        if (this.hp <= 0) {
            this.hp = 0; this.color = '#7f8c8d';
            if (killer && killer.team !== this.team && killer.addXp) { killer.gold += this.goldValue; }
        }
    }

    update(dt, enemyEntities, createParticle) {
        if (this.hp <= 0) return;

        this.target = null;
        let minDistance = Infinity;
        let potentialTargets = enemyEntities.sort((a,b) => (a.constructor.name === "Minion" ? -1 : 1));

        for (const enemy of potentialTargets) {
            if (enemy.hp > 0) {
                const distance = Math.sqrt(Math.pow(enemy.x - this.x, 2) + Math.pow(enemy.y - this.y, 2));
                if (distance <= this.attackRange && distance < minDistance) {
                    minDistance = distance;
                    this.target = enemy;
                }
            }
        }

        if (this.target) {
            const now = performance.now() / 1000;
            if (now > this.lastAttackTime + this.attackCooldown) {
                createParticle(this.x, this.y, 'projectile', this.target, this.attackDamage, this);
                this.lastAttackTime = now;
            }
        }
    }

    draw(ctx) {
        ctx.fillStyle = this.color; ctx.fillRect(this.x-this.size/2, this.y-this.size/2, this.size, this.size);
        if(this.hp > 0){
            const hpW=80, hpR=this.hp/this.maxHp;
            ctx.fillStyle='#e74c3c';ctx.fillRect(this.x-hpW/2,this.y-this.size/2-20,hpW,10);
            ctx.fillStyle='#2ecc71';ctx.fillRect(this.x-hpW/2,this.y-this.size/2-20,hpW*hpR,10);
        }
    }
}