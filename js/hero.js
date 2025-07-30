// js/hero.js
import { TEAM } from './teams.js';

export default class Hero {
    constructor(x, y) {
        // Properti dasar
        this.x = x; this.y = y; this.size = 15;
        this.color = '#3498db'; this.targetX = x; this.targetY = y;
        this.team = TEAM.PLAYER; // Tetapkan tim untuk hero

        // Sistem Progresi
        this.level = 1; this.xp = 0; this.gold = 600;
        this.skillPoints = 1; this.items = [];

        // Stats Dasar
        this.baseMaxHp = 300; this.baseDamage = 30; this.baseSpeed = 200;
        
        // Stats Total (dihitung ulang)
        this.totalMaxHp = 0; this.totalDamage = 0; this.totalSpeed = 0;
        this.totalReturnDamage = 0;
        this.hp = this.baseMaxHp;

        // Definisi Skills
        this.skills = {
            q: { key: 'q', level: 0, maxLevel: 5, cooldown: 5, lastUsed: -Infinity, name: 'Magic Bolt', description: "Menembakkan proyektil sihir ke musuh terdekat.", getDynamicValues: (hero) => ({ damage: 50 + hero.skills.q.level * 25 + hero.totalDamage * 0.2 })},
            w: { key: 'w', level: 0, maxLevel: 5, cooldown: 12, lastUsed: -Infinity, name: 'Adrenaline Rush', description: "Meningkatkan kecepatan gerak secara drastis untuk sementara.", getDynamicValues: (hero) => ({ speed_boost: 80 + hero.skills.w.level * 10, duration: 2 + hero.skills.w.level * 0.2 })},
            e: { key: 'e', level: 0, maxLevel: 5, cooldown: 8, lastUsed: -Infinity, name: 'Defensive Stance', description: "Menguatkan pertahanan, mengurangi damage yang diterima untuk sementara.", getDynamicValues: (hero) => ({ damage_reduction: 10 + hero.skills.e.level * 5, duration: 3 })},
            r: { key: 'r', level: 0, maxLevel: 3, cooldown: 60, lastUsed: -Infinity, name: 'Meteor Strike', description: "Menjatuhkan meteor besar ke tower musuh.", getDynamicValues: (hero) => ({ damage: 200 + hero.skills.r.level * 150 + hero.totalDamage * 0.5 })}
        };
        
        this.activeEffects = [];
        this.recalculateStats();
    }

    recalculateStats() {
        let bonusHp = 0, bonusDamage = 0, bonusSpeed = 0, bonusReturnDamage = 0;
        this.items.forEach(item => {
            bonusHp += item.stats.maxHp || 0;
            bonusDamage += item.stats.damage || 0;
            bonusSpeed += item.stats.speed || 0;
            bonusReturnDamage += item.stats.returnDamage || 0;
        });
        const oldMaxHp = this.totalMaxHp;
        this.totalMaxHp = Math.round(this.baseMaxHp + (this.level - 1) * 50 + bonusHp);
        this.totalDamage = Math.round(this.baseDamage + (this.level - 1) * 3 + bonusDamage);
        this.totalSpeed = this.baseSpeed + bonusSpeed;
        this.totalReturnDamage = bonusReturnDamage;
        if(this.hp > 0) {
            this.hp += (this.totalMaxHp - oldMaxHp);
            if (this.hp > this.totalMaxHp) this.hp = this.totalMaxHp;
        }
    }

    xpForLevel(level) { return Math.floor(100 * Math.pow(level, 1.5)); }

    addXp(amount) {
        if (this.hp <= 0) return;
        this.xp += amount;
        while (this.xp >= this.xpForLevel(this.level + 1)) { this.levelUp(); }
    }

    levelUp() {
        this.level++;
        this.skillPoints++;
        const healthPercent = this.hp / this.totalMaxHp;
        this.recalculateStats();
        this.hp = this.totalMaxHp * healthPercent;
    }

    canUpgradeSkill(key) {
        const skill = this.skills[key];
        if (this.skillPoints <= 0 || skill.level >= skill.maxLevel) return false;
        if (skill.key === 'r' && ![6, 12, 18].includes(this.level)) return false;
        return true;
    }

    upgradeSkill(key) {
        if (this.canUpgradeSkill(key)) {
            this.skills[key].level++;
            this.skillPoints--;
        }
    }

    takeDamage(damage, source) {
        if (this.hp <= 0) return;
        const defenseEffect = this.activeEffects.find(eff => eff.type === 'defense_boost');
        let finalDamage = damage;
        if (defenseEffect) {
            finalDamage *= (1 - defenseEffect.value / 100);
        }
        this.hp -= finalDamage;

        if (this.totalReturnDamage > 0 && source && source.takeDamage) {
            source.takeDamage(this.totalReturnDamage, this);
        }

        if (this.hp <= 0) {
            this.hp = 0;
            this.color = '#7f8c8d';
        }
    }

    useSkill(key, getPotentialTargets, createParticle) {
        const skill = this.skills[key];
        const now = performance.now() / 1000;
        if (!skill || skill.level === 0 || now < skill.lastUsed + skill.cooldown || this.hp <= 0) return;
        skill.lastUsed = now;
        const dynamicValues = skill.getDynamicValues(this);
        const targets = getPotentialTargets();
        switch (key) {
            case 'q':
                let closestEnemy = targets.find(t => t.hp > 0);
                if (closestEnemy) createParticle(this.x, this.y, 'projectile', closestEnemy, dynamicValues.damage, this);
                break;
            case 'w':
                this.activeEffects.push({ type: 'speed_boost', value: dynamicValues.speed_boost, endTime: now + dynamicValues.duration });
                break;
            case 'e':
                this.activeEffects.push({ type: 'defense_boost', value: dynamicValues.damage_reduction, endTime: now + dynamicValues.duration });
                break;
            case 'r':
                let tower = targets.find(t => t.constructor.name === "Tower" && t.hp > 0);
                if (tower) createParticle(this.x, this.y, 'ultimate_projectile', tower, dynamicValues.damage, this);
                break;
        }
    }

    grantReward(type, amount, duration) {
        if (type === 'gold') {
            this.gold += amount;
        } else if (type === 'xp_buff') {
            this.addXp(amount);
        }
    }

    moveTo(x, y) { if (this.hp > 0) { this.targetX = x; this.targetY = y; } }

    update(dt) {
        if (this.hp <= 0) return;
        const now = performance.now() / 1000;
        this.activeEffects = this.activeEffects.filter(eff => now < eff.endTime);

        let currentSpeed = this.totalSpeed;
        const speedBoostEffect = this.activeEffects.find(eff => eff.type === 'speed_boost');
        if (speedBoostEffect) {
            currentSpeed *= (1 + speedBoostEffect.value / 100);
        }

        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > 1) {
            this.x += (dx / distance) * currentSpeed * dt;
            this.y += (dy / distance) * currentSpeed * dt;
        }
    }

    draw(ctx) {
        const originalColor = this.color;

        if (this.activeEffects.find(e => e.type === 'speed_boost')) ctx.fillStyle = '#f39c12';
        else if (this.activeEffects.find(e => e.type === 'defense_boost')) ctx.fillStyle = '#a569bd';
        else ctx.fillStyle = originalColor;

        if (this.hp <= 0) {
            ctx.fillStyle = '#7f8c8d';
        }

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = originalColor;
    }
}