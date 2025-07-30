// js/map-config.js
import { TEAM } from './teams.js';

export const mapConfig = {
    // Waypoints untuk setiap jalur yang akan diikuti minion
    lanes: {
        top: [
            { x: 100, y: 150 }, { x: 300, y: 150 },
            { x: 800, y: 150 }, { x: 1000, y: 150 },
        ],
        mid: [
            { x: 150, y: 360 }, { x: 450, y: 360 },
            { x: 630, y: 360 }, { x: 930, y: 360 },
        ],
        bottom: [
            { x: 100, y: 570 }, { x: 300, y: 570 },
            { x: 800, y: 570 }, { x: 1000, y: 570 },
        ]
    },
    // Posisi tower untuk setiap tim
    towers: [
        { x: 300, y: 150, team: TEAM.PLAYER }, // Top Player
        { x: 150, y: 360, team: TEAM.PLAYER }, // Mid Player
        { x: 300, y: 570, team: TEAM.PLAYER }, // Bottom Player
        { x: 800, y: 150, team: TEAM.ENEMY },  // Top Enemy
        { x: 930, y: 360, team: TEAM.ENEMY },  // Mid Enemy
        { x: 800, y: 570, team: TEAM.ENEMY },  // Bottom Enemy
    ],
    // Posisi dan tipe monster jungle
    jungleCamps: [
        { x: 400, y: 250, type: 'Goblin', rewardType: 'gold', rewardAmount: 100 },
        { x: 680, y: 470, type: 'Golem', rewardType: 'xp_buff', rewardAmount: 200, buffDuration: 30 },
    ]
};