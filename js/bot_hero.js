// js/bot_hero.js
import { TEAM } from './teams.js';
import { mapConfig } from './map-config.js';

export default class BotHero {
    constructor(x, y, team, lanePath) {
        this.x = x; this.y = y; this.size = 15;
        this.team = team;
        this.color = '#e74c3c'; // Warna merah untuk musuh
        this.path = [];
        this.lanePath = lanePath; // Path default untuk push lane
        this.currentLanePathIndex = 0;

        this.hp = 300; this.maxHp = 300;
        this.baseSpeed = 200;
        this.attackRange = 150;
        this.attackDamage = 25;
        this.attackCooldown = 1.3;
        this.lastAttackTime = 0;
        
        this.attackTarget = null;
        this.angle = 0;

        // Timer untuk kapan harus meminta keputusan baru dari AI Python
        this.aiUpdateTimer = 0;
        this.aiUpdateInterval = 2.0; // Minta keputusan baru setiap 2 detik
    }

    takeDamage(damage, source) {
        this.hp -= damage;
        if (this.hp <= 0) this.hp = 0;
        // Mungkin bisa ditambahkan logika aggro di sini jika diinginkan
    }

    // Fungsi utama yang berkomunikasi dengan Python
    async fetchActionFromAI(player) {
        const gameState = {
            bot_info: {
                x: this.x, y: this.y, hp: this.hp, maxHp: this.maxHp
            },
            player_info: player.isDead ? null : {
                x: player.x, y: player.y
            },
            enemy_base_pos: mapConfig.basePosition[this.team]
        };

        try {
            const response = await fetch('http://127.0.0.1:5001/get_bot_action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(gameState)
            });
            if (!response.ok) {
                console.error("Gagal menghubungi server AI"); return;
            }
            const decision = await response.json();
            this.handleAIDecision(decision);
        } catch (error) {
            console.error("Error saat fetch ke server AI:", error);
        }
    }

    // Menerapkan keputusan dari AI
    handleAIDecision(decision) {
        this.path = []; // Reset path lama
        this.attackTarget = null;

        switch (decision.action) {
            case 'retreat':
                // Di sini kita butuh pathfinding. Untuk sekarang, kita gerak lurus dulu.
                this.path = [{x: decision.target.x, y: decision.target.y}];
                break;
            case 'attack_hero':
                this.attackTarget = { x: decision.target.x, y: decision.target.y, isPlayer: true };
                break;
            case 'push_lane':
                // Jika sudah di ujung lane, jangan lakukan apa-apa
                if (this.currentLanePathIndex >= this.lanePath.length) return;
                this.path = [this.lanePath[this.currentLanePathIndex]];
                break;
        }
    }

    update(dt, player, findPathFunction) {
        this.aiUpdateTimer -= dt;
        if (this.aiUpdateTimer <= 0) {
            this.fetchActionFromAI(player);
            this.aiUpdateTimer = this.aiUpdateInterval;
        }

        let targetPoint = null;
        if (this.attackTarget) {
            const distance = Math.hypot(this.attackTarget.x - this.x, this.attackTarget.y - this.y);
            this.angle = Math.atan2(this.attackTarget.y - this.y, this.attackTarget.x - this.x);
            if (distance <= this.attackRange) {
                // Serang player (logika serangan bisa ditambahkan)
                return; 
            }
            targetPoint = this.attackTarget;
        } else if (this.path.length > 0) {
            const waypoint = this.path[0];
            const distance = Math.hypot(waypoint.x - this.x, waypoint.y - this.y);
            if (distance < 10) {
                this.path.shift();
                // Jika tujuan push lane tercapai, increment index
                if(this.path.length === 0 && this.currentLanePathIndex < this.lanePath.length){
                    this.currentLanePathIndex++;
                }
                if (this.path.length === 0) return;
            }
            targetPoint = this.path[0];
        }

        if (targetPoint) {
            this.angle = Math.atan2(targetPoint.y - this.y, targetPoint.x - this.x);
            this.x += Math.cos(this.angle) * this.baseSpeed * dt;
            this.y += Math.sin(this.angle) * this.baseSpeed * dt;
        }
    }

    draw(ctx) {
        if (this.hp <= 0) return;
        ctx.fillStyle = this.color;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.beginPath(); ctx.moveTo(this.size, 0);
        ctx.lineTo(-this.size / 2, -this.size / 2);
        ctx.lineTo(-this.size / 2, this.size / 2);
        ctx.closePath(); ctx.fill(); ctx.restore();

        // HP Bar
        const barW = 40, barH = 6;
        ctx.fillStyle = '#111'; ctx.fillRect(this.x - barW/2, this.y - this.size - 10, barW, barH);
        ctx.fillStyle = '#2ecc71'; ctx.fillRect(this.x - barW/2, this.y - this.size - 10, barW * (this.hp/this.maxHp), barH);
    }
}