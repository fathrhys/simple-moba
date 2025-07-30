// js/ui.js
export class UI {
    constructor(canvas, shop) {
        this.canvas = canvas;
        this.shop = shop;
        this.upgradeButtons = [];
        this.skillIconRects = [];
    }

    draw(ctx, hero, hoveredSkillKey) {
        this.upgradeButtons = [];
        this.skillIconRects = [];
        this.drawPlayerStats(ctx, hero);
        this.drawSkills(ctx, hero);
        this.drawItems(ctx, hero);
        if (this.shop.isOpen) { this.drawShop(ctx, hero); }
        if (hoveredSkillKey) { this.drawTooltip(ctx, hero, hoveredSkillKey); }
    }

    checkUpgradeButtonClick(mouseX, mouseY) {
        for (const button of this.upgradeButtons) {
            if (mouseX >= button.x && mouseX <= button.x + button.width &&
                mouseY >= button.y && mouseY <= button.y + button.height) {
                return button.key;
            }
        }
        return null;
    }

    checkSkillIconHover(mouseX, mouseY) {
        for (const rect of this.skillIconRects) {
            if (mouseX >= rect.x && mouseX <= rect.x + rect.width &&
                mouseY >= rect.y && mouseY <= rect.y + rect.height) {
                return rect.key;
            }
        }
        return null;
    }

    drawSkills(ctx, hero) {
        const now = performance.now() / 1000;
        Object.values(hero.skills).forEach((skill, i) => {
            const x = 250 + i * 70, y = this.canvas.height - 100, size = 60;
            this.skillIconRects.push({ x, y, width: size, height: size, key: skill.key });

            ctx.fillStyle = skill.level > 0 ? '#2c3e50' : '#7f8c8d';
            ctx.fillRect(x, y, size, size);
            ctx.strokeStyle = 'white';
            ctx.strokeRect(x, y, size, size);

            ctx.fillStyle = 'white';
            ctx.font = '24px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(skill.key.toUpperCase(), x + size / 2, y + 40);

            ctx.font = '12px Arial';
            ctx.textAlign = 'right';
            ctx.fillStyle = 'white';
            ctx.fillText(skill.level, x + size - 5, y + 15);

            if (hero.canUpgradeSkill(skill.key)) {
                const btnSize=20, btnX=x+size-btnSize/2, btnY=y-btnSize/2;
                ctx.fillStyle='gold';
                ctx.fillRect(btnX,btnY,btnSize,btnSize);
                ctx.strokeStyle='black';
                ctx.lineWidth=2;
                ctx.strokeRect(btnX,btnY,btnSize,btnSize);
                ctx.fillStyle='black';
                ctx.font='20px Arial';
                ctx.textAlign='center';
                ctx.fillText('+',btnX+btnSize/2,btnY+btnSize-4);
                this.upgradeButtons.push({x:btnX,y:btnY,width:btnSize,height:btnSize,key:skill.key});
            }

            const cooldownLeft = Math.max(0, (skill.lastUsed + skill.cooldown) - now);
            if (cooldownLeft > 0) {
                ctx.fillStyle='rgba(0,0,0,0.7)';
                ctx.fillRect(x,y,size,size*(cooldownLeft/skill.cooldown));
                ctx.fillStyle='white';
                ctx.font='28px Arial';
                ctx.textAlign='center';
                ctx.fillText(cooldownLeft.toFixed(1),x+size/2,y+42);
            }
        });
        ctx.lineWidth = 1;
    }

    drawTooltip(ctx, hero, skillKey) {
        const skill = hero.skills[skillKey];
        const dynamicValues = skill.getDynamicValues(hero);
        const nameText = `${skill.name} (Level ${skill.level})`;
        const descText = skill.description;
        let valueText = "";
        if (dynamicValues.damage !== undefined) valueText += `Damage: ${Math.round(dynamicValues.damage)}\n`;
        if (dynamicValues.duration !== undefined) valueText += `Durasi: ${dynamicValues.duration.toFixed(1)}s\n`;
        if (dynamicValues.speed_boost !== undefined) valueText += `Bonus Kecepatan: +${dynamicValues.speed_boost}%\n`;
        if (dynamicValues.damage_reduction !== undefined) valueText += `Pengurangan Damage: ${dynamicValues.damage_reduction}%\n`;
        const lines = [nameText, "---", descText, "---", ...valueText.split('\n').filter(l => l)];
        
        ctx.font = '14px Arial';
        let maxWidth = 0;
        lines.forEach(line => {
            const width = ctx.measureText(line).width;
            if (width > maxWidth) maxWidth = width;
        });
        const boxWidth = maxWidth + 20;
        const boxHeight = lines.length * 18 + 10;
        const iconRect = this.skillIconRects.find(r => r.key === skillKey);
        const boxX = iconRect.x - boxWidth / 2 + iconRect.width / 2;
        const boxY = iconRect.y - boxHeight - 10;

        ctx.fillStyle='rgba(0,0,0,0.85)';
        ctx.fillRect(boxX,boxY,boxWidth,boxHeight);
        ctx.strokeStyle='gold';
        ctx.strokeRect(boxX,boxY,boxWidth,boxHeight);
        ctx.fillStyle='white';
        ctx.textAlign='left';
        lines.forEach((line, i) => {
            ctx.fillText(line, boxX + 10, boxY + 20 + i * 18);
        });
    }

    drawPlayerStats(ctx, hero) {
        ctx.fillStyle='rgba(0,0,0,0.7)';
        ctx.fillRect(0,this.canvas.height-120,this.canvas.width,120);
        const hpX=250,hpY=this.canvas.height-45,hpW=300,hpH=30;
        ctx.fillStyle='#c0392b';
        ctx.fillRect(hpX,hpY,hpW,hpH);
        ctx.fillStyle='#2ecc71';
        ctx.fillRect(hpX,hpY,hpW*(hero.hp/hero.totalMaxHp),hpH);
        ctx.strokeStyle='white';
        ctx.strokeRect(hpX,hpY,hpW,hpH);
        ctx.fillStyle='white';
        ctx.font='18px Arial';
        ctx.textAlign='center';
        ctx.fillText(`${Math.round(hero.hp)} / ${hero.totalMaxHp}`,hpX+hpW/2,hpY+22);
        ctx.textAlign='left';
        ctx.font='20px Arial';
        ctx.fillText(`Level: ${hero.level} (${hero.skillPoints} SP)`,20,this.canvas.height-90);
        ctx.fillText(`Gold: ${hero.gold}`,20,this.canvas.height-60);
        const xpForNextLevel = hero.xpForLevel(hero.level+1)-hero.xpForLevel(hero.level);
        const currentXpInLevel = hero.xp-hero.xpForLevel(hero.level);
        const xpRatio = currentXpInLevel/xpForNextLevel;
        ctx.fillStyle='#bdc3c7';
        ctx.fillRect(20,this.canvas.height-45,200,10);
        ctx.fillStyle='#f1c40f';
        ctx.fillRect(20,this.canvas.height-45,200*xpRatio,10);
    }
    drawItems(ctx, hero) {
        for (let i = 0; i < 6; i++) {
            const x = 580 + i * 55, y = this.canvas.height - 100;
            ctx.fillStyle = '#1c2833';
            ctx.fillRect(x, y, 50, 50);
            ctx.strokeStyle = 'gray';
            ctx.strokeRect(x, y, 50, 50);
            if (hero.items[i]) {
                ctx.fillStyle = 'gold';
                ctx.fillRect(x + 5, y + 5, 40, 40);
                ctx.fillStyle = 'black';
                ctx.font = '8px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(hero.items[i].name.substring(0, 5), x + 25, y + 25);
            }
        }
    }
    drawShop(ctx, hero) {
        const shopX = 200, shopY = 100, shopW = 600, shopH = 400;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(shopX, shopY, shopW, shopH);
        ctx.strokeStyle = 'gold';
        ctx.strokeRect(shopX, shopY, shopW, shopH);
        ctx.fillStyle = 'white';
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('ITEM SHOP (Tekan B untuk Tutup)', shopX + shopW / 2, shopY + 35);
        ctx.textAlign = 'left';
        Object.entries(this.shop.items).forEach(([id, item], i) => {
            const itemY = shopY + 80 + i * 60;
            ctx.fillStyle = hero.gold >= item.cost ? 'white' : 'gray';
            ctx.font = '18px Arial';
            ctx.fillText(`[${i+1}] ${item.name}`, shopX + 20, itemY);
            ctx.font = '16px Arial';
            ctx.fillText(item.desc, shopX + 20, itemY + 25);
            ctx.textAlign = 'right';
            ctx.fillStyle = hero.gold >= item.cost ? 'gold' : 'gray';
            ctx.fillText(`${item.cost} G`, shopX + shopW - 20, itemY);
            ctx.textAlign = 'left';
        });
    }
}