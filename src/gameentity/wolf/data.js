export function getWolfSize() {
    const sizes = {
        normal: 1.0,
        alpha: 1.3,
        scout: 0.9,
        hunter: 1.1
    }
    return sizes[this.type] || 1.0
}

export function getWolfColors() {
    const colorSchemes = {
        normal: {
            primary: '#6b5d54',    // Brown-grey
            secondary: '#4a4038',   // Darker brown
            belly: '#8b7d74',       // Lighter brown
            eyes: '#ffd700',        // Golden yellow
            nose: '#1a1a1a',        // Black
            claws: '#2c2c2c'        // Dark grey
        },
        alpha: {
            primary: '#3a3a3a',     // Dark grey
            secondary: '#1a1a1a',   // Black
            belly: '#5a5a5a',       // Medium grey
            eyes: '#ff4444',        // Red
            nose: '#000000',        // Pure black
            claws: '#1a1a1a'        // Black
        },
        scout: {
            primary: '#8b7355',     // Light brown
            secondary: '#6b5a47',   // Medium brown
            belly: '#a89484',       // Tan
            eyes: '#90ee90',        // Light green
            nose: '#2a2a2a',        // Dark grey
            claws: '#3c3c3c'        // Grey
        },
        hunter: {
            primary: '#4a3c30',     // Dark brown
            secondary: '#2a1f18',   // Very dark brown
            belly: '#6a5a4a',       // Medium brown
            eyes: '#ffa500',        // Orange
            nose: '#1a1a1a',        // Black
            claws: '#2c2c2c'        // Dark grey
        }
    }
    return colorSchemes[this.type] || colorSchemes.normal
}

export function getPackRole() {
    const roles = {
        alpha: 'leader',
        scout: 'scout',
        hunter: 'hunter',
        normal: 'pack_member'
    }
    return roles[this.type] || 'pack_member'
}

export function getWolfTypeFromWasm(wasmType) {
    switch(wasmType) {
        case 0: return 'normal';
        case 1: return 'alpha';
        case 2: return 'scout';
        case 3: return 'hunter';
        default: return 'normal';
    }
}
