// js/game.js
import { TEAM } from './teams.js';
import { mapConfig } from './map-config.js';
import Hero from './hero.js';
import Tower from './tower.js';
import Minion from './minion.js';
import JungleMonster from './jungle-monster.js';
import Particle from './particle.js';
import { UI } from './ui.js';
import { Shop } from './shop.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const shop = new Shop();
const ui = new UI(canvas, shop);

const player = new Hero(200, 360);
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

function getEntityAt(mouseX, mouseY) {
    const allTargets = [
        ...towers.filter(t => t.team !== TEAM.PLAYER),
        ...minions.filter(m => m.team !== TEAM.PLAYER),
        ...jungleMonsters
    ];
    for (const target of allTargets) {
        if (target.hp > 0) {
            const distance = Math.sqrt(Math.pow(target.x - mouseX, 2) + Math.pow(target.y - mouseY, 2));
            if (distance <= target.size + 5) { // Beri sedikit toleransi hitbox
                return target;
            }
        }
    }
    return null;
}

function getEnemiesFor(entity) {
    const allEntities = [player, ...towers, ...minions, ...jungleMonsters];
    return allEntities.filter(e => e.hp > 0 && e.team !== entity.team && e.team !== TEAM.NEUTRAL);
}

function getAllAttackable(entity) {
    const allEntities = [player, ...minions];
    return allEntities.filter(e => e.hp > 0 && e.team !== TEAM.NEUTRAL);
}

function createParticle(x, y, type, target = null, damage = 0, owner = null) {
    particles.push(new Particle(x, y, type, target, damage, owner));
}

function gameLoop(timestamp) {
    const deltaTime = (timestamp - lastTime) / 1000 || 0;
    lastTime = timestamp;

    minionSpawnTimer -= deltaTime;
    if (minionSpawnTimer <= 0) {
        for (const laneName in mapConfig.lanes) {
            const spawnPointPlayer = mapConfig.lanes[laneName][0];
            const spawnPointEnemy = mapConfig.lanes[laneName][mapConfig.lanes[laneName].length - 1];
            for (let i = 0; i < 5; i++) {
                minions.push(new Minion(spawnPointPlayer.x, spawnPointPlayer.y, TEAM.PLAYER, mapConfig.lanes[laneName]));
                minions.push(new Minion(spawnPointEnemy.x, spawnPointEnemy.y, TEAM.ENEMY, mapConfig.lanes[laneName]));
            }
        }
        minionSpawnTimer = 30;
    }

    player.update(deltaTime, createParticle);
    towers.forEach(t => t.update(deltaTime, getEnemiesFor(t), createParticle));
    minions.forEach(m => m.update(deltaTime, getEnemiesFor(m), createParticle));
    jungleMonsters.forEach(j => j.update(deltaTime, getAllAttackable(j), createParticle));
    particles.forEach(p => p.update(deltaTime));

    minions = minions.filter(m => !m.shouldBeRemoved);
    jungleMonsters = jungleMonsters.filter(j => !j.shouldBeRemoved);
    particles = particles.filter(p => !p.shouldBeRemoved);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    towers.forEach(t => t.draw(ctx));
    minions.forEach(m => m.draw(ctx));
    jungleMonsters.forEach(j => j.draw(ctx));
    player.draw(ctx);
    particles.forEach(p => p.draw(ctx));
    ui.draw(ctx, player, hoveredSkillKey);

    requestAnimationFrame(gameLoop);
}

canvas.addEventListener('contextmenu', e => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const target = getEntityAt(mouseX, mouseY);
    if (target) {
        player.setAttackTarget(target);
    } else {
        player.clearAttackTarget();
        player.moveTo(mouseX, mouseY);
    }
});

window.addEventListener('keydown', e => {
    const key = e.key.toLowerCase();
    if (player.skills[key]) {
        player.useSkill(key, () => getEnemiesFor(player), createParticle);
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
    if (clickedSkillKey) {
        player.upgradeSkill(clickedSkillKey);
    }
});

canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    hoveredSkillKey = ui.checkSkillIconHover(mouseX, mouseY);
});

canvas.addEventListener('mouseout', e => {
    hoveredSkillKey = null;
});

setupMap();
requestAnimationFrame(gameLoop);