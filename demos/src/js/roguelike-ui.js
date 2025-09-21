/**
 * Roguelike UI Interactive Components
 * Provides dynamic functionality for the adventure game UI elements
 */

class RoguelikeUI {
    constructor() {
        this.health = 100;
        this.maxHealth = 100;
        this.stamina = 100;
        this.maxStamina = 100;
        this.selectedInventorySlot = 0;
        this.selectedActionButton = 0;
        this.quests = [];
        this.characterStats = {
            level: 1,
            xp: 0,
            gold: 0,
            essence: 0
        };
        
        this.init();
    }
    
    init() {
        this.setupHealthBar();
        this.setupStaminaBar();
        this.setupInventory();
        this.setupActionBar();
        this.setupMinimap();
        this.setupQuestLog();
        this.setupCharacterStats();
        this.startUpdateLoop();
    }
    
    setupHealthBar() {
        const healthBar = document.querySelector('.health-bar');
        const healthText = document.querySelector('.health-text');
        
        if (healthBar && healthText) {
            this.updateHealthBar();
        }
    }
    
    setupStaminaBar() {
        const staminaBar = document.querySelector('.stamina-bar');
        
        if (staminaBar) {
            this.updateStaminaBar();
        }
    }
    
    setupInventory() {
        const inventorySlots = document.querySelectorAll('.inventory-slot');
        
        inventorySlots.forEach((slot, index) => {
            slot.addEventListener('click', () => {
                this.selectInventorySlot(index);
            });
            
            slot.addEventListener('mouseenter', () => {
                this.showItemTooltip(slot, index);
            });
            
            slot.addEventListener('mouseleave', () => {
                this.hideItemTooltip();
            });
        });
    }
    
    setupActionBar() {
        const actionButtons = document.querySelectorAll('.action-button');
        
        actionButtons.forEach((button, index) => {
            button.addEventListener('click', () => {
                this.selectActionButton(index);
            });
            
            button.addEventListener('mouseenter', () => {
                this.showActionTooltip(button, index);
            });
            
            button.addEventListener('mouseleave', () => {
                this.hideActionTooltip();
            });
        });
    }
    
    setupMinimap() {
        const minimapCanvas = document.querySelector('.minimap-canvas');
        
        if (minimapCanvas) {
            this.drawMinimap(minimapCanvas);
        }
    }
    
    setupQuestLog() {
        const questItems = document.querySelectorAll('.quest-item');
        
        questItems.forEach((quest, index) => {
            quest.addEventListener('click', () => {
                this.showQuestDetails(index);
            });
        });
    }
    
    setupCharacterStats() {
        this.updateCharacterStats();
    }
    
    updateHealthBar() {
        const healthBar = document.querySelector('.health-bar');
        const healthText = document.querySelector('.health-text');
        
        if (healthBar && healthText) {
            const percentage = (this.health / this.maxHealth) * 100;
            healthBar.style.width = `${percentage}%`;
            healthText.textContent = `${this.health}/${this.maxHealth}`;
            
            // Change color based on health level
            if (percentage > 60) {
                healthBar.style.background = 'linear-gradient(90deg, #228b22, #006400)';
            } else if (percentage > 30) {
                healthBar.style.background = 'linear-gradient(90deg, #ff8c00, #ff4500)';
            } else {
                healthBar.style.background = 'linear-gradient(90deg, #dc143c, #8b0000)';
            }
        }
    }
    
    updateStaminaBar() {
        const staminaBar = document.querySelector('.stamina-bar');
        
        if (staminaBar) {
            const percentage = (this.stamina / this.maxStamina) * 100;
            staminaBar.style.width = `${percentage}%`;
            
            // Add pulsing effect when stamina is low
            if (percentage < 20) {
                staminaBar.style.animation = 'stamina-pulse 0.5s ease-in-out infinite';
            } else {
                staminaBar.style.animation = 'stamina-pulse 1.5s ease-in-out infinite';
            }
        }
    }
    
    selectInventorySlot(index) {
        // Remove previous selection
        document.querySelectorAll('.inventory-slot').forEach(slot => {
            slot.classList.remove('selected');
        });
        
        // Select new slot
        const slots = document.querySelectorAll('.inventory-slot');
        if (slots[index]) {
            slots[index].classList.add('selected');
            this.selectedInventorySlot = index;
        }
    }
    
    selectActionButton(index) {
        // Remove previous selection
        document.querySelectorAll('.action-button').forEach(button => {
            button.classList.remove('selected');
        });
        
        // Select new button
        const buttons = document.querySelectorAll('.action-button');
        if (buttons[index]) {
            buttons[index].classList.add('selected');
            this.selectedActionButton = index;
            
            // Add cooldown effect
            buttons[index].classList.add('cooldown');
            setTimeout(() => {
                buttons[index].classList.remove('cooldown');
            }, 2000);
        }
    }
    
    drawMinimap(canvas) {
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        
        // Draw background
        ctx.fillStyle = '#1a0f08';
        ctx.fillRect(0, 0, width, height);
        
        // Draw grid
        ctx.strokeStyle = '#654321';
        ctx.lineWidth = 1;
        
        for (let x = 0; x < width; x += 20) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
        
        for (let y = 0; y < height; y += 20) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
        
        // Draw player position
        ctx.fillStyle = '#daa520';
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, 4, 0, 2 * Math.PI);
        ctx.fill();
        
        // Draw some random rooms/enemies
        ctx.fillStyle = '#8b4513';
        ctx.fillRect(30, 30, 15, 15); // Room 1
        ctx.fillRect(80, 60, 15, 15); // Room 2
        
        // Draw enemies
        ctx.fillStyle = '#dc143c';
        ctx.beginPath();
        ctx.arc(50, 50, 2, 0, 2 * Math.PI);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(90, 80, 2, 0, 2 * Math.PI);
        ctx.fill();
    }
    
    showItemTooltip(slot, index) {
        const tooltip = document.createElement('div');
        tooltip.className = 'item-tooltip';
        tooltip.style.cssText = `
            position: absolute;
            background: linear-gradient(145deg, rgba(44, 24, 16, 0.95), rgba(26, 15, 8, 0.98));
            border: 2px solid #8b4513;
            border-radius: 8px;
            padding: 8px;
            color: #e8d5b7;
            font-family: 'Crimson Text', serif;
            font-size: 12px;
            z-index: 10000;
            pointer-events: none;
            box-shadow: 0 8px 16px rgba(0, 0, 0, 0.5);
        `;
        
        const items = ['Iron Sword', 'Wooden Shield', 'Health Potion', '', 'Ancient Key', '', 'Magic Gem', ''];
        const descriptions = [
            'A sturdy iron blade (+5 Attack)',
            'Basic protection (+3 Defense)',
            'Restores 50 health points',
            '',
            'Opens ancient doors',
            '',
            'Mystical energy source',
            ''
        ];
        
        if (items[index]) {
            tooltip.innerHTML = `
                <strong>${items[index]}</strong><br>
                ${descriptions[index]}
            `;
            
            document.body.appendChild(tooltip);
            
            // Position tooltip
            const rect = slot.getBoundingClientRect();
            tooltip.style.left = `${rect.right + 10}px`;
            tooltip.style.top = `${rect.top}px`;
            
            this.currentTooltip = tooltip;
        }
    }
    
    hideItemTooltip() {
        if (this.currentTooltip) {
            this.currentTooltip.remove();
            this.currentTooltip = null;
        }
    }
    
    showActionTooltip(button, index) {
        const tooltip = document.createElement('div');
        tooltip.className = 'action-tooltip';
        tooltip.style.cssText = `
            position: absolute;
            background: linear-gradient(145deg, rgba(44, 24, 16, 0.95), rgba(26, 15, 8, 0.98));
            border: 2px solid #8b4513;
            border-radius: 8px;
            padding: 8px;
            color: #e8d5b7;
            font-family: 'Crimson Text', serif;
            font-size: 12px;
            z-index: 10000;
            pointer-events: none;
            box-shadow: 0 8px 16px rgba(0, 0, 0, 0.5);
        `;
        
        const actions = ['Attack', 'Block', 'Dodge', 'Use Item', 'Special Ability'];
        const descriptions = [
            'Perform a basic attack',
            'Raise shield to block incoming attacks',
            'Roll to avoid damage',
            'Use selected inventory item',
            'Cast a special ability'
        ];
        
        tooltip.innerHTML = `
            <strong>${actions[index]}</strong><br>
            ${descriptions[index]}
        `;
        
        document.body.appendChild(tooltip);
        
        // Position tooltip
        const rect = button.getBoundingClientRect();
        tooltip.style.left = `${rect.left}px`;
        tooltip.style.top = `${rect.top - 40}px`;
        
        this.currentTooltip = tooltip;
    }
    
    hideActionTooltip() {
        if (this.currentTooltip) {
            this.currentTooltip.remove();
            this.currentTooltip = null;
        }
    }
    
    showQuestDetails(index) {
        const questDetails = document.createElement('div');
        questDetails.className = 'quest-details';
        questDetails.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(145deg, rgba(44, 24, 16, 0.98), rgba(26, 15, 8, 0.99));
            border: 3px solid #8b4513;
            border-radius: 16px;
            padding: 24px;
            color: #e8d5b7;
            font-family: 'Crimson Text', serif;
            font-size: 14px;
            z-index: 10000;
            max-width: 400px;
            box-shadow: 0 16px 32px rgba(0, 0, 0, 0.7);
        `;
        
        const questTitles = [
            'Defeat the Wolf Pack',
            'Find the Ancient Artifact',
            'Survive the Dungeon'
        ];
        
        const questDescriptions = [
            'Hunt down and eliminate 5 wolves that have been terrorizing the village. Each wolf defeated brings you closer to restoring peace.',
            'Locate the legendary artifact hidden deep within the ancient ruins. This powerful item will aid you in your quest.',
            'Navigate through 10 floors of the treacherous dungeon, facing increasingly dangerous enemies and traps.'
        ];
        
        questDetails.innerHTML = `
            <h3 style="color: #daa520; font-family: 'Cinzel', serif; margin-bottom: 16px;">${questTitles[index]}</h3>
            <p style="margin-bottom: 16px;">${questDescriptions[index]}</p>
            <button onclick="this.parentElement.remove()" style="
                background: linear-gradient(145deg, #2c1810, #1a0f08);
                border: 2px solid #8b4513;
                border-radius: 8px;
                color: #e8d5b7;
                padding: 8px 16px;
                cursor: pointer;
                font-family: 'Cinzel', serif;
                font-weight: 600;
            ">Close</button>
        `;
        
        document.body.appendChild(questDetails);
    }
    
    updateCharacterStats() {
        const statValues = document.querySelectorAll('.stat-value');
        
        if (statValues.length >= 4) {
            statValues[0].textContent = this.characterStats.level;
            statValues[1].textContent = this.characterStats.xp.toLocaleString();
            statValues[2].textContent = this.characterStats.gold.toLocaleString();
            statValues[3].textContent = this.characterStats.essence;
        }
    }
    
    startUpdateLoop() {
        setInterval(() => {
            // Simulate stamina regeneration
            if (this.stamina < this.maxStamina) {
                this.stamina = Math.min(this.maxStamina, this.stamina + 1);
                this.updateStaminaBar();
            }
            
            // Update minimap
            const minimapCanvas = document.querySelector('.minimap-canvas');
            if (minimapCanvas) {
                this.drawMinimap(minimapCanvas);
            }
        }, 100);
    }
    
    // Public methods for external control
    takeDamage(amount) {
        this.health = Math.max(0, this.health - amount);
        this.updateHealthBar();
    }
    
    heal(amount) {
        this.health = Math.min(this.maxHealth, this.health + amount);
        this.updateHealthBar();
    }
    
    useStamina(amount) {
        this.stamina = Math.max(0, this.stamina - amount);
        this.updateStaminaBar();
    }
    
    addXP(amount) {
        this.characterStats.xp += amount;
        this.updateCharacterStats();
    }
    
    addGold(amount) {
        this.characterStats.gold += amount;
        this.updateCharacterStats();
    }
    
    addEssence(amount) {
        this.characterStats.essence += amount;
        this.updateCharacterStats();
    }
}

// Initialize the roguelike UI when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.roguelikeUI = new RoguelikeUI();
});

// Add some CSS for the selected states
const style = document.createElement('style');
style.textContent = `
    .inventory-slot.selected {
        border-color: #ffd700 !important;
        box-shadow: 
            0 0 15px rgba(255, 215, 0, 0.5),
            inset 0 2px 4px rgba(0, 0, 0, 0.3) !important;
    }
    
    .action-button.selected {
        border-color: #ffd700 !important;
        box-shadow: 
            0 0 15px rgba(255, 215, 0, 0.5),
            inset 0 2px 4px rgba(0, 0, 0, 0.3) !important;
    }
`;
document.head.appendChild(style);
