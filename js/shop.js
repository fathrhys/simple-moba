// js/shop.js
const ITEMS = {
    'item_boots': { name: 'Boots of Speed', cost: 400, stats: { speed: 25 }, desc: "Meningkatkan kecepatan gerak." },
    'item_sword': { name: 'Basic Sword', cost: 500, stats: { damage: 15 }, desc: "Meningkatkan damage serangan dasar." },
    'item_health': { name: 'Health Crystal', cost: 450, stats: { maxHp: 150 }, desc: "Meningkatkan maksimum HP." },
    'item_armor': { name: 'Spiked Armor', cost: 1800, stats: { maxHp: 100, returnDamage: 15 }, desc: "Saat diserang, memantulkan 15 physical damage kembali ke penyerang." },
    'item_ultimate_orb': { name: 'Ultimate Orb', cost: 2100, stats: { damage: 25, maxHp: 250, speed: 10 }, desc: "Item kuat yang meningkatkan semua status." },
};

export class Shop {
    constructor() {
        this.isOpen = false;
        this.items = ITEMS;
    }

    toggle() {
        this.isOpen = !this.isOpen;
    }

    buyItem(hero, itemId) {
        if (!this.isOpen || !this.items[itemId]) return;
        const item = this.items[itemId];
        if (hero.gold >= item.cost && hero.items.length < 6) {
            hero.gold -= item.cost;
            hero.items.push(item);
            hero.recalculateStats();
            console.log(`Hero membeli ${item.name}!`);
        } else {
            console.log("Tidak cukup gold atau inventory penuh!");
        }
    }
}