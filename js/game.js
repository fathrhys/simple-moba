// js/game.js
import { TEAM } from './teams.js';
import { mapConfig } from './map-config.js';
import Camera from './camera.js';
import Hero from './hero.js';
import Tower from './tower.js';
import Minion from './minion.js';
import JungleMonster from './jungle-monster.js';
import Particle from './particle.js';
import { UI } from './ui.js';
import { Shop } from './shop.js';
import { BATTLE_SPELLS } from './battle-spells.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const shop = new Shop();
const ui = new UI(canvas, shop);

const camera = new Camera(canvas, mapConfig.world.width, mapConfig.world.height);
const player = new Hero(mapConfig.basePosition[TEAM.PLAYER].x, mapConfig.basePosition[TEAM.PLAYER].y);
let towers = [];
let minions = [];
let jungleMonsters = [];
let particles = [];
let hoveredSkillKey = null;
let lastTime = 0;
let minionSpawnTimer = 20;

function setupMap() {
    mapConfig.towers.forEach(t => towers.push(new Tower(t.x, t.y, t.team)));
    mapConfig.jungleCamps.forEach(c => jungleMonsters.push(new JungleMonster(c.x, c.y, c)));
}

function getEntityAt(worldX, worldY, includeAllies = false) {
    let allTargets = [
        ...towers.filter(t => t.team !== TEAM.PLAYER),
        ...minions.filter(m => m.team !== TEAM.PLAYER),
        ...jungleMonsters
    ];

    // Jika kita ingin bisa menarget ally (untuk deny)
    if (includeAllies) {
        allTargets.push(...minions.filter(m => m.team === TEAM.PLAYER));
    }

    for (const target of allTargets) {
        if (target.hp > 0) {
            const distance = Math.sqrt(Math.pow(target.x - worldX, 2) + Math.pow(target.y - worldY, 2));
            if (distance <= target.size + 5) { return target; }
        }
    }
    return null;
}

function getEnemiesFor(entity) {
    const allEntities = [player, ...towers, ...minions, ...jungleMonsters];
    // Minion kini bisa menarget minion musuh dan tower
    if (entity.constructor.name === "Minion") {
        const enemyTeam = (entity.team === TEAM.PLAYER) ? TEAM.ENEMY : TEAM.PLAYER;
        return [
            ...minions.filter(e => e.hp > 0 && e.team === enemyTeam),
            ...towers.filter(e => e.hp > 0 && e.team === enemyTeam),
        ];
    }
    return allEntities.filter(e => e.hp > 0 && e.team !== entity.team && e.team !== TEAM.NEUTRAL);
}

function getAllAttackable(entity) {
    const allEntities = [player, ...minions, ...towers];
    return allEntities.filter(e => e.hp > 0 && e.team !== TEAM.NEUTRAL);
}

function createParticle(x, y, type, target = null, damage = 0, owner = null) {
    particles.push(new Particle(x, y, type, target, damage, owner));
}

function gameLoop(timestamp) {
    const deltaTime = (timestamp - lastTime) / 1000 || 0;
    lastTime = timestamp;

    camera.update(player);

    minionSpawnTimer -= deltaTime;
    if (minionSpawnTimer <= 0) {
        for (const laneName in mapConfig.lanes) {
            const spawnPointPlayer = mapConfig.basePosition[TEAM.PLAYER];
            const spawnPointEnemy = mapConfig.basePosition[TEAM.ENEMY];
            for (let i = 0; i < 5; i++) {
                minions.push(new Minion(spawnPointPlayer.x - i*20, spawnPointPlayer.y, TEAM.PLAYER, mapConfig.lanes[laneName]));
                minions.push(new Minion(spawnPointEnemy.x + i*20, spawnPointEnemy.y, TEAM.ENEMY, [...mapConfig.lanes[laneName]].reverse()));
            }
        }
        minionSpawnTimer = 30;
    }

    player.update(deltaTime, createParticle, () => getEnemiesFor(player));
    towers.forEach(t => t.update(deltaTime, getEnemiesFor(t), createParticle));
    minions.forEach(m => m.update(deltaTime, getEnemiesFor(m), createParticle));
    jungleMonsters.forEach(j => j.update(deltaTime, getAllAttackable(j), createParticle));
    particles.forEach(p => p.update(deltaTime));

    minions = minions.filter(m => !m.shouldBeRemoved);
    jungleMonsters = jungleMonsters.filter(j => !j.shouldBeRemoved);
    particles = particles.filter(p => !p.shouldBeRemoved);

    camera.reset(ctx);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    camera.apply(ctx);

    // --- START: GAMBAR VISUAL MAP ---
    // Gambar Latar Belakang Dasar (Area Rumput/Tanah)
    ctx.fillStyle = '#16a085'; // Warna hijau tua untuk rumput
    ctx.fillRect(0, 0, mapConfig.world.width, mapConfig.world.height);

    // Gambar Jalur (Lanes)
    ctx.fillStyle = '#27ae60'; // Warna hijau lebih terang untuk jalur
    ctx.fillRect(100, 200, 2800, 200); // Top Lane
    ctx.fillRect(100, 900, 2800, 200); // Mid Lane
    ctx.fillRect(100, 1600, 2800, 200); // Bottom Lane
    // --- END: GAMBAR VISUAL MAP ---


    // Gambar Latar Belakang Dunia
    ctx.fillStyle = '#1e272e';
    ctx.fillRect(0, 0, mapConfig.world.width, mapConfig.world.height);
    
    // Gambar Tembok
    ctx.fillStyle = '#2c3e50';
    mapConfig.walls.forEach(w => ctx.fillRect(w.x, w.y, w.width, w.height));

    towers.forEach(t => t.draw(ctx));
    minions.forEach(m => m.draw(ctx));
    jungleMonsters.forEach(j => j.draw(ctx));
    player.draw(ctx);
    particles.forEach(p => p.draw(ctx));

    ctx.restore();
    
    ui.draw(ctx, player, hoveredSkillKey);

    requestAnimationFrame(gameLoop);
}

canvas.addEventListener('contextmenu', e => {
    e.preventDefault();
    if(player.isDead) return;
    const rect = canvas.getBoundingClientRect();
    const worldX = e.clientX - rect.left + camera.x;
    const worldY = e.clientY - rect.top + camera.y;

    // Cek apakah target adalah minion kawan yang bisa di-deny
    const potentialTarget = getEntityAt(worldX, worldY, true); // `true` untuk memasukkan ally
    if (potentialTarget && potentialTarget.team === TEAM.PLAYER && potentialTarget.constructor.name === 'Minion') {
        // Hanya bisa deny jika HP minion di bawah 50%
        if (potentialTarget.hp / potentialTarget.maxHp < 0.5) {
            player.setAttackTarget(potentialTarget);
        } else {
            player.clearAttackTarget();
            player.moveTo(worldX, worldY);
        }
    } else if (potentialTarget) { // Target musuh atau jungle
        player.setAttackTarget(potentialTarget);
    } else { // Tidak ada target, hanya bergerak
        player.clearAttackTarget();
        player.moveTo(worldX, worldY);
    }
});


window.addEventListener('keydown', e => {
    const key = e.key.toLowerCase();
    if (player.skills[key]) {
        player.useSkill(key, () => getEnemiesFor(player), createParticle);
    } else if (key === BATTLE_SPELLS.recall.key || (BATTLE_SPELLS.regen && key === BATTLE_SPELLS.regen.key)) {
        player.useBattleSpell(key);
    } else if (key === 'b') {
        shop.toggle();
    } else if (shop.isOpen && !isNaN(parseInt(key))) {
        const itemId = Object.keys(shop.items)[parseInt(key) - 1];
        if (itemId) shop.buyItem(player, itemId);
    }
});

canvas.addEventListener('click', e => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const clickedSkillKey = ui.checkUpgradeButtonClick(mouseX, mouseY);
    if (clickedSkillKey) { player.upgradeSkill(clickedSkillKey); }
});

canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    hoveredSkillKey = ui.checkSkillIconHover(mouseX, mouseY);
});

canvas.addEventListener('mouseout', e => { hoveredSkillKey = null; });

setupMap();
requestAnimationFrame(gameLoop);