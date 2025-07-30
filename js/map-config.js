// js/map-config.js
import { TEAM } from './teams.js';

export const mapConfig = {
    world: {
        width: 3000,
        height: 2000,
    },
    basePosition: {
        [TEAM.PLAYER]: { x: 150, y: 1000 },
        [TEAM.ENEMY]: { x: 2850, y: 1000 },
    },
    lanes: {
        top: [ { x: 300, y: 300 }, { x: 1000, y: 300 }, { x: 2000, y: 300 }, { x: 2700, y: 300 } ],
        mid: [ { x: 400, y: 1000 }, { x: 1000, y: 1000 }, { x: 2000, y: 1000 }, { x: 2600, y: 1000 } ],
        bottom: [ { x: 300, y: 1700 }, { x: 1000, y: 1700 }, { x: 2000, y: 1700 }, { x: 2700, y: 1700 } ]
    },
    towers: [
        { x: 600, y: 300, team: TEAM.PLAYER }, { x: 400, y: 1000, team: TEAM.PLAYER }, { x: 600, y: 1700, team: TEAM.PLAYER },
        { x: 2400, y: 300, team: TEAM.ENEMY }, { x: 2600, y: 1000, team: TEAM.ENEMY }, { x: 2400, y: 1700, team: TEAM.ENEMY },
    ],
    jungleCamps: [
        { x: 900, y: 700, type: 'Goblin', rewardType: 'gold', rewardAmount: 100 },
        { x: 2100, y: 1300, type: 'Golem', rewardType: 'xp_buff', rewardAmount: 200, buffDuration: 30 },
    ],
    walls: [
        // Batas luar peta
        { x: 0, y: 0, width: 3000, height: 100 },
        { x: 0, y: 1900, width: 3000, height: 100 },
        { x: 0, y: 100, width: 100, height: 1800 },
        { x: 2900, y: 100, width: 100, height: 1800 },
        // Tembok internal
        { x: 1200, y: 500, width: 600, height: 100 },
        { x: 1450, y: 1100, width: 100, height: 400 },
    ]
};