// js/battle-spells.js
export const BATTLE_SPELLS = {
    // Tombol 'B' akan menjadi standar untuk recall
    recall: {
        key: 'b', // <-- Diubah dari 'd' ke 'b' agar lebih intuitif
        name: 'Recall',
        cooldown: 180, // 3 menit
        channelTime: 8, // 8 detik
        description: "Setelah menyalurkan selama 8 detik, teleportasi kembali ke base."
    },
    regen: {
        key: 'f',
        name: 'Regen',
        cooldown: 120, // 2 menit
        duration: 5,
        regenAmount: 20,
        description: "Memulihkan 20 HP per detik selama 5 detik."
    }
};