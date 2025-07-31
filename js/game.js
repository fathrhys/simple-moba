// js/game.js
import { TEAM } from './teams.js';
import { mapConfig } from './map-config.js';
import Camera from './camera.js';
import Hero from './hero.js';
import Tower from './tower.js';
import Minion from './minion.js';
import JungleMonster from './jungle-monster.js';
import BotHero from './bot_hero.js'; // <-- Sudah benar
import Particle from './particle.js';
import { UI } from './ui.js';
import { Shop } from './shop.js';
import { BATTLE_SPELLS } from './battle-spells.js';
import { createNavGrid, findPath } from './pathfinding.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const shop = new Shop();
const ui = new UI(canvas, shop);

const camera = new Camera(canvas, mapConfig.world.width, mapConfig.world.height);
const player = new Hero(mapConfig.basePosition[TEAM.PLAYER].x, mapConfig.basePosition[TEAM.PLAYER].y);
let botPlayer = null; // <-- Sudah benar
let towers = [];
let minions = [];
let jungleMonsters = [];
let particles = [];
let hoveredSkillKey = null;
let lastTime = 0;
let minionSpawnTimer = 20;

let navGrid = null;

function setupMap() {
    mapConfig.towers.forEach(t => towers.push(new Tower(t.x, t.y, t.team)));
    mapConfig.jungleCamps.forEach(c => jungleMonsters.push(new JungleMonster(c.x, c.y, c)));

    // =========================================================
    // BAGIAN YANG HILANG 1: INISIALISASI BOT
    // Bot harus dibuat di sini agar muncul di dalam game.
    // =========================================================
    const botSpawn = mapConfig.basePosition[TEAM.ENEMY];
    const botLanePath = [...mapConfig.lanes.mid].reverse(); 
    botPlayer = new BotHero(botSpawn.x, botSpawn.y, TEAM.ENEMY, botLanePath);
    // =========================================================

    console.log("Membuat grid navigasi untuk pathfinding...");
    navGrid = createNavGrid(mapConfig.world.width, mapConfig.world.height, mapConfig.walls);
    console.log("Grid navigasi berhasil dibuat.");
}

function getEntityAt(worldX, worldY, includeAllies = false) {
    // ... (Fungsi ini tidak berubah)
    let allTargets = [
        ...towers.filter(t => t.team !== TEAM.PLAYER),
        ...minions.filter(m => m.team !== TEAM.PLAYER),
        ...jungleMonsters
    ];
    if (botPlayer && botPlayer.hp > 0) { // Tambahkan bot ke target
        allTargets.push(botPlayer);
    }
    if (includeAllies) {
        allTargets.push(...minions.filter(m => m.team === TEAM.PLAYER));
    }
    for (const target of allTargets) {
        if (target.hp > 0) {
            const distance = Math.hypot(target.x - worldX, target.y - worldY);
            if (distance <= target.size + 5) { return target; }
        }
    }
    return null;
}

function getEnemiesFor(entity) {
    // ... (Fungsi ini perlu diupdate sedikit agar tahu ada Bot)
    const allEntities = [player, botPlayer, ...towers, ...minions, ...jungleMonsters].filter(e => e); // .filter(e=>e) untuk membuang null jika bot belum dibuat
    if (entity.constructor.name === "Minion") {
        const enemyTeam = (entity.team === TEAM.PLAYER) ? TEAM.ENEMY : TEAM.PLAYER;
        return allEntities.filter(e => e.hp > 0 && e.team === enemyTeam);
    }
    return allEntities.filter(e => e.hp > 0 && e.team !== entity.team && e.team !== TEAM.NEUTRAL);
}

function getAllAttackable(entity) {
    // ... (Fungsi ini tidak berubah)
    const allEntities = [player, botPlayer, ...minions, ...towers].filter(e => e);
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

    // UPDATE LOGIC
    player.update(deltaTime, createParticle, () => getEnemiesFor(player));
    // =========================================================
    // BAGIAN YANG HILANG 2: UPDATE BOT
    // Otak AI bot harus di-update setiap frame.
    // =========================================================
    if (botPlayer) {
        botPlayer.update(deltaTime, player, findPath);
    }
    // =========================================================
    towers.forEach(t => t.update(deltaTime, getEnemiesFor(t), createParticle));
    minions.forEach(m => m.update(deltaTime, getEnemiesFor(m), createParticle));
    jungleMonsters.forEach(j => j.update(deltaTime, getAllAttackable(j), createParticle));
    particles.forEach(p => p.update(deltaTime));

    // FILTER ENTITIES
    minions = minions.filter(m => !m.shouldBeRemoved);
    jungleMonsters = jungleMonsters.filter(j => !j.shouldBeRemoved);
    particles = particles.filter(p => !p.shouldBeRemoved);

    // DRAWING
    camera.reset(ctx);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    camera.apply(ctx);

    ctx.fillStyle = '#1e272e';
    ctx.fillRect(0, 0, mapConfig.world.width, mapConfig.world.height);
    ctx.fillStyle = '#2c3e50';
    mapConfig.walls.forEach(w => ctx.fillRect(w.x, w.y, w.width, w.height));

    towers.forEach(t => t.draw(ctx));
    minions.forEach(m => m.draw(ctx));
    jungleMonsters.forEach(j => j.draw(ctx));
    player.draw(ctx);
    // =========================================================
    // BAGIAN YANG HILANG 3: GAMBAR BOT
    // Bot harus digambar ke canvas agar terlihat.
    // =========================================================
    if (botPlayer) {
        botPlayer.draw(ctx);
    }
    // =========================================================
    particles.forEach(p => p.draw(ctx));

    ctx.restore();
    ui.draw(ctx, player, hoveredSkillKey);
    requestAnimationFrame(gameLoop);
}

// --- Event Listener tidak ada perubahan ---
canvas.addEventListener('contextmenu', e => {
    e.preventDefault();
    if (player.isDead || !navGrid) return;

    const rect = canvas.getBoundingClientRect();
    const worldX = e.clientX - rect.left + camera.x;
    const worldY = e.clientY - rect.top + camera.y;

    const potentialTarget = getEntityAt(worldX, worldY);

    if (potentialTarget && potentialTarget.team !== TEAM.PLAYER) {
        player.setAttackTarget(potentialTarget);
    } else {
        player.clearAttackTarget();
        const startPos = { x: player.x, y: player.y };
        const endPos = { x: worldX, y: worldY };
        const path = findPath(startPos, endPos, navGrid);

        if (path) {
            player.setPath(path);
        } else {
            console.log("Tidak ada jalan yang valid ke lokasi tujuan!");
        }
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

// JALANKAN GAME
setupMap();
requestAnimationFrame(gameLoop);