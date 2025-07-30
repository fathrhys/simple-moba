// js/hero.js
import { TEAM } from './teams.js';
import { BATTLE_SPELLS } from './battle-spells.js';
import { mapConfig } from './map-config.js';

export default class Hero {
    constructor(x, y) {
        this.x = x; this.y = y; this.size = 15;
        this.color = '#3498db'; this.targetX = x; this.targetY = y;
        this.team = TEAM.PLAYER;
        this.isDead = false;
        this.respawnTimer = 0;
        this.respawnTime = 5;
        this.battleSpells = {
            recall: { data: BATTLE_SPELLS.recall, lastUsed: -Infinity, isChanneling: false, channelEndTime: 0 },
            regen: { data: BATTLE_SPELLS.regen, lastUsed: -Infinity },
        };
        this.level = 1; this.xp = 0; this.gold = 600;
        this.skillPoints = 1; this.items = [];
        this.baseMaxHp = 300; this.baseDamage = 30; this.baseSpeed = 200;
        this.totalMaxHp = 0; this.totalDamage = 0; this.totalSpeed = 0;
        this.totalReturnDamage = 0;
        this.hp = this.baseMaxHp;
        this.attackTarget = null; this.attackRange = 150;
        this.attackCooldown = 1.2; this.lastAttackTime = 0;
        this.skills = {
            q: { key: 'q', level: 0, maxLevel: 5, cooldown: 5, lastUsed: -Infinity, name: 'Magic Bolt', description: "Menembakkan proyektil sihir ke musuh terdekat.", getDynamicValues: (hero) => ({ damage: 50 + hero.skills.q.level * 25 + hero.totalDamage * 0.2 })},
            w: { key: 'w', level: 0, maxLevel: 5, cooldown: 12, lastUsed: -Infinity, name: 'Adrenaline Rush', description: "Meningkatkan kecepatan gerak secara drastis untuk sementara.", getDynamicValues: (hero) => ({ speed_boost: 80 + hero.skills.w.level * 10, duration: 2 + hero.skills.w.level * 0.2 })},
            e: { key: 'e', level: 0, maxLevel: 5, cooldown: 8, lastUsed: -Infinity, name: 'Defensive Stance', description: "Menguatkan pertahanan, mengurangi damage yang diterima untuk sementara.", getDynamicValues: (hero) => ({ damage_reduction: 10 + hero.skills.e.level * 5, duration: 3 })},
            r: { key: 'r', level: 0, maxLevel: 3, cooldown: 60, lastUsed: -Infinity, name: 'Meteor Strike', description: "Menjatuhkan meteor besar ke tower musuh.", getDynamicValues: (hero) => ({ damage: 200 + hero.skills.r.level * 150 + hero.totalDamage * 0.5 })}
        };
        this.activeEffects = [];
        this.recalculateStats();
    }
    
    setAttackTarget(target) { this.attackTarget = target; }
    clearAttackTarget() { this.attackTarget = null; }

    respawn() {
        this.isDead = false;
        const base = mapConfig.basePosition[this.team];
        this.x = base.x; this.y = base.y;
        this.targetX = base.x; this.targetY = base.y;
        this.hp = this.totalMaxHp;
        this.attackTarget = null;
    }

    takeDamage(damage, source) {
        if (this.isDead) return;
        this.stopChannelingRecall();
        
        let finalDamage = damage;
        const defenseEffect = this.activeEffects.find(eff => eff.type === 'defense_boost');
        if (defenseEffect) { finalDamage *= (1 - defenseEffect.value / 100); }
        this.hp -= finalDamage;
        
        if (this.totalReturnDamage > 0 && source && source.takeDamage) { source.takeDamage(this.totalReturnDamage, this); }

        if (this.hp <= 0) {
            this.hp = 0;
            this.isDead = true;
            this.respawnTimer = this.respawnTime + this.level * 2;
            this.attackTarget = null;
            this.activeEffects = [];
        }
    }

    useBattleSpell(key) {
        if (this.isDead) return;
        const now = performance.now() / 1000;
        if (key === this.battleSpells.recall.data.key) {
            const spell = this.battleSpells.recall;
            if (now > spell.lastUsed + spell.data.cooldown) {
                this.isChanneling = true;
                this.channelEndTime = now + spell.data.channelTime;
            }
        }
    }

    stopChannelingRecall() {
        if (this.battleSpells.recall.isChanneling) {
            this.battleSpells.recall.isChanneling = false;
        }
    }

    update(dt, createParticle) {
        if (this.isDead) {
            this.respawnTimer -= dt;
            if (this.respawnTimer <= 0) { this.respawn(); }
            return;
        }

        const now = performance.now() / 1000;
        this.activeEffects = this.activeEffects.filter(eff => now < eff.endTime);

        const recall = this.battleSpells.recall;
        if (recall.isChanneling) {
            if (now >= recall.channelEndTime) {
                recall.isChanneling = false;
                recall.lastUsed = now;
                const base = mapConfig.basePosition[this.team];
                this.x = base.x; this.y = base.y;
                this.targetX = this.x; this.targetY = this.y;
                this.attackTarget = null;
                return;
            }
            return;
        }

        let currentSpeed = this.totalSpeed;
        const speedBoostEffect = this.activeEffects.find(eff => eff.type === 'speed_boost');
        if (speedBoostEffect) { currentSpeed *= (1 + speedBoostEffect.value / 100); }

        let nextX = this.x, nextY = this.y, isMoving = false;
        let targetPoint = { x: this.targetX, y: this.targetY };

        if (this.attackTarget && this.attackTarget.hp > 0) {
            targetPoint = { x: this.attackTarget.x, y: this.attackTarget.y };
            const dx = targetPoint.x - this.x;
            const dy = targetPoint.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance <= this.attackRange) {
                this.basicAttack(createParticle);
            } else {
                isMoving = true;
            }
        } else {
            const dx = this.targetX - this.x;
            const dy = this.targetY - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance > 1) {
                isMoving = true;
            }
        }

        if (isMoving) {
            this.stopChannelingRecall();
            const dx = targetPoint.x - this.x;
            const dy = targetPoint.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance > 0) {
                nextX += (dx / distance) * currentSpeed * dt;
                nextY += (dy / distance) * currentSpeed * dt;

                let canMove = true;
                for (const wall of mapConfig.walls) {
                    if (nextX + this.size > wall.x && nextX - this.size < wall.x + wall.width &&
                        nextY + this.size > wall.y && nextY - this.size < wall.y + wall.height) {
                        canMove = false;
                        break;
                    }
                }
                if (canMove) { this.x = nextX; this.y = nextY; }
            }
        }
    }

    draw(ctx) {
        if (this.isDead) return;
        const originalColor = this.color;
        if (this.activeEffects.find(e => e.type === 'speed_boost')) ctx.fillStyle = '#f39c12';
        else if (this.activeEffects.find(e => e.type === 'defense_boost')) ctx.fillStyle = '#a569bd';
        else ctx.fillStyle = originalColor;

        ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = originalColor;

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.attackRange, 0, Math.PI * 2); ctx.stroke();
        
        const recall = this.battleSpells.recall;
        if (recall.isChanneling) {
            const now = performance.now() / 1000;
            const channelProgress = (now - (recall.channelEndTime - recall.data.channelTime)) / recall.data.channelTime;
            const barW = 50, barH = 8;
            ctx.fillStyle = '#555'; ctx.fillRect(this.x - barW/2, this.y + this.size + 5, barW, barH);
            ctx.fillStyle = '#3498db'; ctx.fillRect(this.x - barW/2, this.y + this.size + 5, barW * channelProgress, barH);
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
        this.stopChannelingRecall();
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
        if (type === 'gold') { 
            this.gold += amount; 
        } else if (type === 'xp') { 
            this.addXp(amount); 
        } 
    }
    moveTo(x, y) { if (!this.isDead) { this.targetX = x; this.targetY = y; } }
}