// js/hero.js
import { TEAM } from './teams.js';
import { BATTLE_SPELLS } from './battle-spells.js';
import { mapConfig } from './map-config.js';

export default class Hero {
    constructor(x, y) {
        this.x = x; this.y = y; this.size = 15;
        this.color = '#3498db';
        this.path = []; // Menyimpan jalur dari A*
        this.team = TEAM.PLAYER;
        this.isDead = false;
        this.respawnTimer = 0;
        this.respawnTime = 5;
        this.angle = 0;
        this.battleSpells = {
            recall: { data: BATTLE_SPELLS.recall, lastUsed: -Infinity, isChanneling: false, channelEndTime: 0 },
            regen: { data: BATTLE_SPELLS.regen, lastUsed: -Infinity },
        };
        this.level = 1; this.xp = 0; this.gold = 600;
        this.skillPoints = 1; this.items = [];
        this.baseMaxHp = 300; this.baseDamage = 30; this.baseSpeed = 220;
        this.totalMaxHp = 0; this.totalDamage = 0; this.totalSpeed = 0;
        this.totalReturnDamage = 0;
        this.hp = this.baseMaxHp;
        this.attackTarget = null; this.attackRange = 150;
        this.attackCooldown = 1.2; this.lastAttackTime = 0;
        this.skills = {
            q: { key: 'q', level: 0, maxLevel: 5, cooldown: 5, lastUsed: -Infinity, name: 'Magic Bolt', description: "Menembakkan proyektil sihir ke musuh terdekat.", getDynamicValues: (hero) => ({
damage: 50 + hero.skills.q.level * 25 + hero.totalDamage * 0.2 })},
            w: { key: 'w', level: 0, maxLevel: 5, cooldown: 12, lastUsed: -Infinity, name: 'Adrenaline Rush', description: "Meningkatkan kecepatan gerak secara drastis untuk sementara.", getDynamicValues: (hero) => ({ speed_boost: 80 + hero.skills.w.level * 10, duration: 2 + hero.skills.w.level * 0.2 })},
            e: { key: 'e', level: 0, maxLevel: 5, cooldown: 8, lastUsed: -Infinity, name: 'Defensive Stance', description: "Menguatkan pertahanan, mengurangi damage yang diterima untuk sementara.",
getDynamicValues: (hero) => ({ damage_reduction: 10 + hero.skills.e.level * 5, duration: 3 })},
            r: { key: 'r', level: 0, maxLevel: 3, cooldown: 60, lastUsed: -Infinity, name: 'Meteor Strike', description: "Menjatuhkan meteor besar ke tower musuh.", getDynamicValues: (hero) => ({ damage: 200 + hero.skills.r.level * 150 + hero.totalDamage * 0.5 })}
        };
        this.activeEffects = [];
        this.recalculateStats();
    }

    setPath(newPath) {
        if (newPath && newPath.length > 0) this.path = newPath;
        else this.path = [];
        this.clearAttackTarget();
    }

    setAttackTarget(target) {
        this.attackTarget = target;
        this.path = [];
    }

    clearAttackTarget() { this.attackTarget = null; }

    respawn() {
        this.isDead = false;
        const base = mapConfig.basePosition[this.team];
        this.x = base.x; this.y = base.y;
        this.path = [];
        this.hp = this.totalMaxHp;
        this.attackTarget = null;
    }

    takeDamage(damage, source) {
        if (this.isDead) return;
        this.stopChannelingRecall();
        // Berhenti bergerak jika diserang, kecuali jika sedang mengejar target
        if (!this.attackTarget) {
            this.path = [];
        }
        
        let finalDamage = damage;
        const defenseEffect = this.activeEffects.find(eff => eff.type === 'defense_boost');
        if (defenseEffect) { finalDamage *= (1 - defenseEffect.value / 100); }
        this.hp -= finalDamage;

        if (this.totalReturnDamage > 0 && source && source.takeDamage) { source.takeDamage(this.totalReturnDamage, this); }

        if (this.hp <= 0) {
            this.hp = 0; this.isDead = true; this.respawnTimer = this.respawnTime + this.level * 2;
            this.attackTarget = null; this.activeEffects = []; this.path = [];
        }
    }
    
    // ========================================================================
    // LOGIKA UPDATE PALING KAKU DAN STABIL
    // ========================================================================
    update(dt, createParticle) {
        if (this.isDead) {
            this.respawnTimer -= dt;
            if (this.respawnTimer <= 0) this.respawn();
            return;
        }

        const now = performance.now() / 1000;
        this.activeEffects = this.activeEffects.filter(eff => now < eff.endTime);
        if (this.battleSpells.recall.isChanneling) return;

        let currentSpeed = this.totalSpeed;
        const speedBoostEffect = this.activeEffects.find(eff => eff.type === 'speed_boost');
        if (speedBoostEffect) { currentSpeed *= (1 + speedBoostEffect.value / 100); }

        let targetPoint = null;

        // PRIORITAS 1: Menyerang/Mengejar Target
        if (this.attackTarget && this.attackTarget.hp > 0) {
            const distanceToTarget = Math.hypot(this.attackTarget.x - this.x, this.attackTarget.y - this.y);

            // Langsung hadap ke target
            this.angle = Math.atan2(this.attackTarget.y - this.y, this.attackTarget.x - this.x);

            if (distanceToTarget <= this.attackRange) {
                // Jika dalam jangkauan, serang dan JANGAN bergerak
                this.basicAttack(createParticle);
                return; // <-- PENTING: Hentikan fungsi update di sini
            } else {
                // Jika di luar jangkauan, kejar target
                targetPoint = this.attackTarget;
            }
        } 
        // PRIORITAS 2: Mengikuti Path
        else if (this.path.length > 0) {
            const waypoint = this.path[0];
            const distanceToWaypoint = Math.hypot(waypoint.x - this.x, waypoint.y - this.y);
            
            // Cek jika sudah sampai di waypoint
            if (distanceToWaypoint < 5) {
                this.path.shift(); // Hapus waypoint yang sudah dicapai
                // Jika path sudah habis, berhenti.
                if (this.path.length === 0) return;
            }
            
            // Tetapkan waypoint berikutnya sebagai tujuan gerak
            targetPoint = this.path[0];
        }

        // FASE PERGERAKAN: Hanya dijalankan jika ada `targetPoint`
        if (targetPoint) {
            this.stopChannelingRecall();
            
            // 1. Tentukan arah (Angle) secara instan/kaku
            this.angle = Math.atan2(targetPoint.y - this.y, targetPoint.x - this.x);
            
            // 2. Bergerak lurus ke arah tersebut
            this.x += Math.cos(this.angle) * currentSpeed * dt;
            this.y += Math.sin(this.angle) * currentSpeed * dt;
        }
    }

    draw(ctx) {
        if (this.isDead) return;

        // Gambar garis path (tetap berguna untuk visualisasi)
        if (this.path.length > 0) {
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            this.path.forEach(point => ctx.lineTo(point.x, point.y));
            ctx.strokeStyle = 'rgba(255, 255, 0, 0.7)';
            ctx.lineWidth = 2; ctx.setLineDash([5, 5]); ctx.stroke(); ctx.setLineDash([]);
        }

        // Gambar hero, sama seperti sebelumnya
        const originalColor = this.color;
        if (this.activeEffects.find(e => e.type === 'speed_boost')) ctx.fillStyle = '#f39c12';
        else if (this.activeEffects.find(e => e.type === 'defense_boost')) ctx.fillStyle = '#a569bd';
        else ctx.fillStyle = originalColor;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.beginPath(); ctx.moveTo(this.size, 0);
        ctx.lineTo(-this.size / 2, -this.size / 2);
        ctx.lineTo(-this.size / 2, this.size / 2);
        ctx.closePath(); ctx.fill(); ctx.restore();

        ctx.fillStyle = originalColor;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.attackRange, 0, Math.PI * 2); ctx.stroke();
    }
    
    // --- METODE LAIN (TIDAK ADA PERUBAHAN DARI SEBELUMNYA) ---
    useBattleSpell(key) {
        if (this.isDead) return;
        const now = performance.now() / 1000;
        if (key === this.battleSpells.recall.data.key) {
            const spell = this.battleSpells.recall;
            if (now > spell.lastUsed + spell.data.cooldown) {
                this.isChanneling = true; this.channelEndTime = now + spell.data.channelTime;
                this.path = [];
            }
        }
    }
    stopChannelingRecall() {
        if (this.battleSpells.recall.isChanneling) {
            this.battleSpells.recall.isChanneling = false;
        }
    }
    basicAttack(createParticle) {
        const now = performance.now() / 1000;
        if (this.attackTarget && this.attackTarget.hp > 0 && now > this.lastAttackTime + this.attackCooldown) {
            createParticle(this.x, this.y, 'projectile', this.attackTarget, this.totalDamage, this);
            this.lastAttackTime = now;
        }
    }
    recalculateStats() {
        let bonusHp = 0, bonusDamage = 0, bonusSpeed = 0, bonusReturnDamage = 0;
        this.items.forEach(item => {
            bonusHp += item.stats.maxHp || 0; bonusDamage += item.stats.damage || 0;
            bonusSpeed += item.stats.speed || 0; bonusReturnDamage += item.stats.returnDamage || 0;
        });
        const oldMaxHp = this.totalMaxHp || this.baseMaxHp;
        this.totalMaxHp = Math.round(this.baseMaxHp + (this.level - 1) * 50 + bonusHp);
        this.totalDamage = Math.round(this.baseDamage + (this.level - 1) * 3 + bonusDamage);
        this.totalSpeed = this.baseSpeed + bonusSpeed;
        this.totalReturnDamage = bonusReturnDamage;
        if(this.hp > 0) {
            const hpPercentage = this.hp / oldMaxHp;
            this.hp = this.totalMaxHp * hpPercentage;
            if (this.hp > this.totalMaxHp) this.hp = this.totalMaxHp;
        }
    }
    xpForLevel(level) { return Math.floor(100 * Math.pow(level, 1.5)); }
    addXp(amount) { if (this.hp > 0) { this.xp += amount; while (this.xp >= this.xpForLevel(this.level + 1)) { this.levelUp(); } } }
    levelUp() { this.level++; this.skillPoints++; const p = this.hp/this.totalMaxHp || 1; this.recalculateStats(); this.hp = this.totalMaxHp * p; }
    canUpgradeSkill(key) {
        const skill = this.skills[key];
        if (this.skillPoints <= 0 || skill.level >= skill.maxLevel) return false;
        if (skill.key === 'r' && ![6, 12, 18].includes(this.level)) return false;
        return true;
    }
    upgradeSkill(key) { if (this.canUpgradeSkill(key)) { this.skills[key].level++; this.skillPoints--; } }
    useSkill(key, getPotentialTargets, createParticle) {
        const skill = this.skills[key]; const now = performance.now() / 1000;
        if (!skill || skill.level === 0 || now < skill.lastUsed + skill.cooldown || this.isDead) return;
        this.stopChannelingRecall(); this.path = [];
        skill.lastUsed = now; const dyn = skill.getDynamicValues(this);
        const targets = getPotentialTargets();
        switch (key) {
            case 'q': let t1=targets.find(t=>t.hp>0); if(t1) createParticle(this.x,this.y,'projectile',t1,dyn.damage,this); break;
            case 'w': this.activeEffects.push({ type: 'speed_boost', value: dyn.speed_boost, endTime: now + dyn.duration }); break;
            case 'e': this.activeEffects.push({ type: 'defense_boost', value: dyn.damage_reduction, endTime: now + dyn.duration }); break;
            case 'r': let t2=targets.find(t=>t.constructor.name==="Tower"&&t.hp>0); if(t2) createParticle(this.x,this.y,'ultimate_projectile',t2,dyn.damage,this); break;
        }
    }
    grantReward(type, amount) {
        if(this.isDead) return;
        if (type === 'gold') this.gold += amount;
        else if (type === 'xp') this.addXp(amount);
    }
}