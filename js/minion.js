// js/minion.js
import { TEAM } from './teams.js'; // <-- BARIS INI YANG HILANG DAN KRUSIAL

export default class Minion {
    constructor(x, y, team, waypoints) {
        this.x = x; this.y = y; this.size = 10;
        this.team = team;
        this.color = (team === TEAM.PLAYER) ? '#2980b9' : '#c0392b'; // Biru untuk Player, Merah untuk Enemy
        this.speed = 60; this.hp = 100; this.maxHp = 100;
        this.attackRange = 50; this.attackDamage = 5;
        this.attackCooldown = 1.5; this.lastAttackTime = 0;
        this.target = null; this.shouldBeRemoved = false;
        this.xpValue = 60; this.goldValue = 25;

        this.waypoints = waypoints;
        // Jika tim musuh, balik urutan waypoints
        if (this.team === TEAM.ENEMY) this.waypoints = [...this.waypoints].reverse();
        this.currentWaypointIndex = 0;
    }

    takeDamage(damage, killer) {
        this.hp -= damage;
        if (this.hp <= 0) {
            this.hp = 0; this.shouldBeRemoved = true;
            if (killer && killer.team !== this.team && killer.addXp) { killer.addXp(this.xpValue); killer.gold += this.goldValue; }
        }
    }

    update(dt, enemyEntities, createParticle) {
        if (this.hp <= 0) return;

        this.target = null;
        let minDistance = Infinity;
        for (const enemy of enemyEntities) {
            if (enemy.hp > 0) {
                const distance = Math.sqrt(Math.pow(enemy.x - this.x, 2) + Math.pow(enemy.y - this.y, 2));
                if (distance < minDistance) {
                    minDistance = distance;
                    this.target = enemy;
                }
            }
        }

        if (this.target && minDistance <= this.attackRange) {
            const now = performance.now() / 1000;
            if (now > this.lastAttackTime + this.attackCooldown) {
                this.target.takeDamage(this.attackDamage, this);
                this.lastAttackTime = now;
            }
        } else {
            if (this.currentWaypointIndex >= this.waypoints.length) return;
            const waypoint = this.waypoints[this.currentWaypointIndex];
            const dx = waypoint.x - this.x;
            const dy = waypoint.y - this.y;
            const distToWaypoint = Math.sqrt(dx * dx + dy * dy);

            if (distToWaypoint < 5) {
                this.currentWaypointIndex++;
            } else {
                this.x += (dx / distToWaypoint) * this.speed * dt;
                this.y += (dy / distToWaypoint) * this.speed * dt;
            }
        }
    }

    draw(ctx) {
        ctx.fillStyle = this.color; ctx.fillRect(this.x-this.size/2, this.y-this.size/2, this.size, this.size);
        const hpBarWidth = 30; const hpRatio = this.hp / this.maxHp;
        ctx.fillStyle='#e74c3c'; ctx.fillRect(this.x-hpBarWidth/2, this.y-this.size/2-10, hpBarWidth, 5);
        ctx.fillStyle='#2ecc71'; ctx.fillRect(this.x-hpBarWidth/2, this.y-this.size/2-10, hpBarWidth*hpRatio, 5);
    }
}