import fs from 'fs';

// Read the file
let content = fs.readFileSync('working-multiplayer-demo.html', 'utf8');

// Replace the resetRoomCreation function to also clear cooldown
const oldReset = `            hasCreatedRoom = false
            addLog('Room creation status reset. You can now create a new room.', 'success')
            updateStatus()`;

const newReset = `            hasCreatedRoom = false
            
            // Clear cooldown timer if active
            if (roomCreationCooldown) {
                clearInterval(roomCreationCooldown)
                roomCreationCooldown = null
                cooldownEndTime = null
                addLog('Room creation cooldown cleared.', 'info')
            }
            
            addLog('Room creation status reset. You can now create a new room.', 'success')
            updateStatus()
            updateButtonText()`;

content = content.replace(oldReset, newReset);

// Write the file back
fs.writeFileSync('working-multiplayer-demo.html', content);

console.log('Added cooldown clearing to resetRoomCreation function');
