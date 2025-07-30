// js/jungle-monster.js
import { TEAM } from './teams.js';

export default class JungleMonster {
    constructor(x, y, config) {
        this.spawnX = x; this.spawnY = y;
        this.x = x; this.y = y;
        this.size = 20; this.color = '#f39c12'; // Oranye
        this.team = TEAM.NEUTRAL;
        this.hp = 400; this.maxHp = 400;
        this.attackDamage = 15; this.attackRange = 50;
        this.attackCooldown = 2; this.lastAttackTime = 0;
        this.leashRange = 200; // Jarak maksimal dari spawn point
        
        this.target = null;
        this.isAggro = false;
        this.shouldBeRemoved = false;
        
        // Info hadiah
        this.type = config.type;
        this.rewardType = config.rewardType;
        this.rewardAmount = config.rewardAmount;
        this.buffDuration = config.buffDuration;
    }

    takeDamage(damage, attacker) {
        this.hp -= damage;
        // Jika diserang, jadikan penyerang sebagai target (aggro)
        if (!this.isAggro) {
            this.isAggro = true;
            this.target = attacker;
        }
        if (this.hp <= 0) {
            this.hp = 0;
            this.shouldBeRemoved = true;
            if (attacker && attacker.grantReward) {
                // Berikan hadiah ke pembunuh
                attacker.grantReward(this.rewardType, this.rewardAmount, this.buffDuration);
            }
        }
    }

    update(dt, allEntities, createParticle) {
        if (!this.isAggro || !this.target || this.target.hp <= 0) {
            // Jika tidak ada target, kembali ke spawn point jika perlu
            const distToSpawn = Math.sqrt(Math.pow(this.spawnX - this.x, 2) + Math.pow(this.spawnY - this.y, 2));
            if (distToSpawn > 5) {
                const dx = this.spawnX - this.x;
                const dy = this.spawnY - this.y;
                this.x += (dx / distToSpawn) * 50 * dt;
                this.y += (dy / distToSpawn) * 50 * dt;
            }
            if (this.hp < this.maxHp) this.hp += 10 * dt; // Regenerasi HP
            return;
        }

        const distToTarget = Math.sqrt(Math.pow(this.target.x - this.x, 2) + Math.pow(this.target.y - this.y, 2));
        const distToSpawn = Math.sqrt(Math.pow(this.spawnX - this.x, 2) + Math.pow(this.spawnY - this.y, 2));

        // Jika target keluar dari leash range, reset
        if (distToSpawn > this.leashRange) {
            this.isAggro = false;
            this.target = null;
            return;
        }

        // Serang jika dalam jangkauan
        if (distToTarget <= this.attackRange) {
            const now = performance.now() / 1000;
            if (now > this.lastAttackTime + this.attackCooldown) {
                this.target.takeDamage(this.attackDamage, this);
                this.lastAttackTime = now;
            }
        } else { // Bergerak menuju target
            this.x += (this.target.x - this.x) / distToTarget * 70 * dt;
            this.y += (this.target.y - this.y) / distToTarget * 70 * dt;
        }
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        // HP Bar
        const hpBarWidth = 40; const hpRatio = this.hp / this.maxHp;
        ctx.fillStyle='#e74c3c'; ctx.fillRect(this.x-hpBarWidth/2, this.y-this.size-15, hpBarWidth, 8);
        ctx.fillStyle='#2ecc71'; ctx.fillRect(this.x-hpBarWidth/2, this.y-this.size-15, hpBarWidth*hpRatio, 8);
    }
}