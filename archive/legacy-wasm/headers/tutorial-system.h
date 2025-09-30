#pragma once

#include "internal_core.h"
#include <cstring>

// Forward declarations
void initialize_explore_tutorial();
void initialize_fight_tutorial();
void initialize_choose_tutorial();
void initialize_powerup_tutorial();
void initialize_risk_tutorial();
void initialize_escalate_tutorial();
void initialize_cashout_tutorial();
void initialize_reset_tutorial();
void complete_tutorial();

// ============================================================================
// Tutorial System - WASM Implementation
// Provides tutorial state tracking and phase-specific guidance
// ============================================================================

#define MAX_TUTORIAL_STEPS 20
#define MAX_TUTORIAL_NAME_LENGTH 64
#define MAX_TUTORIAL_CONTENT_LENGTH 256

// Tutorial step types
enum TutorialStepType {
    TUTORIAL_INSTRUCTION = 0,
    TUTORIAL_DEMONSTRATION = 1,
    TUTORIAL_INTERACTION = 2,
    TUTORIAL_COMPLETION = 3
};

// Tutorial step structure
struct TutorialStep {
    uint32_t id;
    TutorialStepType type;
    char title[MAX_TUTORIAL_NAME_LENGTH];
    char content[MAX_TUTORIAL_CONTENT_LENGTH];
    char highlight[32];
    char action[32];
    bool completed;
    uint64_t timestamp;
};

// Tutorial structure
struct Tutorial {
    uint32_t id;
    char name[MAX_TUTORIAL_NAME_LENGTH];
    char description[MAX_TUTORIAL_CONTENT_LENGTH];
    TutorialStep steps[MAX_TUTORIAL_STEPS];
    uint32_t stepCount;
    bool completed;
    uint64_t startTime;
    uint64_t endTime;
};

// Tutorial system state
static Tutorial g_tutorials[8]; // One for each phase
static uint32_t g_tutorial_count = 0;
static uint32_t g_current_tutorial = 0;
static uint32_t g_current_step = 0;
static bool g_tutorial_active = false;
static bool g_tutorial_enabled = true;

// Tutorial settings
static bool g_auto_start_tutorials = true;
static bool g_show_tooltips = true;
static bool g_skip_completed_tutorials = true;

// ============================================================================
// Tutorial Initialization
// ============================================================================

void initialize_tutorial_system() {
    g_tutorial_count = 0;
    g_current_tutorial = 0;
    g_current_step = 0;
    g_tutorial_active = false;
    
    memset(g_tutorials, 0, sizeof(g_tutorials));
    
    // Initialize tutorials for each phase
    initialize_explore_tutorial();
    initialize_fight_tutorial();
    initialize_choose_tutorial();
    initialize_powerup_tutorial();
    initialize_risk_tutorial();
    initialize_escalate_tutorial();
    initialize_cashout_tutorial();
    initialize_reset_tutorial();
}

void initialize_explore_tutorial() {
    Tutorial* tutorial = &g_tutorials[g_tutorial_count];
    tutorial->id = 0;
    strncpy(tutorial->name, "Exploration Phase", MAX_TUTORIAL_NAME_LENGTH - 1);
    strncpy(tutorial->description, "Learn how to explore and navigate the world", MAX_TUTORIAL_CONTENT_LENGTH - 1);
    tutorial->stepCount = 4;
    tutorial->completed = false;
    
    // Step 1: Movement
    TutorialStep* step = &tutorial->steps[0];
    step->id = 0;
    step->type = TUTORIAL_INSTRUCTION;
    strncpy(step->title, "Movement Controls", MAX_TUTORIAL_NAME_LENGTH - 1);
    strncpy(step->content, "Use WASD or arrow keys to move your character", MAX_TUTORIAL_CONTENT_LENGTH - 1);
    strncpy(step->highlight, "movement", 31);
    strncpy(step->action, "move_around", 31);
    step->completed = false;
    
    // Step 2: Camera
    step = &tutorial->steps[1];
    step->id = 1;
    step->type = TUTORIAL_INSTRUCTION;
    strncpy(step->title, "Camera Control", MAX_TUTORIAL_NAME_LENGTH - 1);
    strncpy(step->content, "The camera follows your character automatically", MAX_TUTORIAL_CONTENT_LENGTH - 1);
    strncpy(step->highlight, "camera", 31);
    strncpy(step->action, "zoom_test", 31);
    step->completed = false;
    
    // Step 3: Interaction
    step = &tutorial->steps[2];
    step->id = 2;
    step->type = TUTORIAL_INSTRUCTION;
    strncpy(step->title, "Interacting with Objects", MAX_TUTORIAL_NAME_LENGTH - 1);
    strncpy(step->content, "Press E or click on interactive objects", MAX_TUTORIAL_CONTENT_LENGTH - 1);
    strncpy(step->highlight, "interaction", 31);
    strncpy(step->action, "interact_test", 31);
    step->completed = false;
    
    // Step 4: Completion
    step = &tutorial->steps[3];
    step->id = 3;
    step->type = TUTORIAL_COMPLETION;
    strncpy(step->title, "Exploration Complete", MAX_TUTORIAL_NAME_LENGTH - 1);
    strncpy(step->content, "Great! You've learned the basics of exploration", MAX_TUTORIAL_CONTENT_LENGTH - 1);
    strncpy(step->highlight, "none", 31);
    strncpy(step->action, "none", 31);
    step->completed = false;
    
    g_tutorial_count++;
}

void initialize_fight_tutorial() {
    Tutorial* tutorial = &g_tutorials[g_tutorial_count];
    tutorial->id = 1;
    strncpy(tutorial->name, "Combat Phase", MAX_TUTORIAL_NAME_LENGTH - 1);
    strncpy(tutorial->description, "Master the 5-button combat system", MAX_TUTORIAL_CONTENT_LENGTH - 1);
    tutorial->stepCount = 6;
    tutorial->completed = false;
    
    // Step 1: Light Attack
    TutorialStep* step = &tutorial->steps[0];
    step->id = 0;
    step->type = TUTORIAL_INSTRUCTION;
    strncpy(step->title, "Light Attack (A1)", MAX_TUTORIAL_NAME_LENGTH - 1);
    strncpy(step->content, "Press A1 or left mouse button for quick attacks", MAX_TUTORIAL_CONTENT_LENGTH - 1);
    strncpy(step->highlight, "combat_light", 31);
    strncpy(step->action, "light_attack", 31);
    step->completed = false;
    
    // Step 2: Heavy Attack
    step = &tutorial->steps[1];
    step->id = 1;
    step->type = TUTORIAL_INSTRUCTION;
    strncpy(step->title, "Heavy Attack (A2)", MAX_TUTORIAL_NAME_LENGTH - 1);
    strncpy(step->content, "Press A2 or right mouse button for powerful attacks", MAX_TUTORIAL_CONTENT_LENGTH - 1);
    strncpy(step->highlight, "combat_heavy", 31);
    strncpy(step->action, "heavy_attack", 31);
    step->completed = false;
    
    // Step 3: Block and Parry
    step = &tutorial->steps[2];
    step->id = 2;
    step->type = TUTORIAL_INSTRUCTION;
    strncpy(step->title, "Block and Parry", MAX_TUTORIAL_NAME_LENGTH - 1);
    strncpy(step->content, "Hold Block to reduce damage, tap for perfect parry", MAX_TUTORIAL_CONTENT_LENGTH - 1);
    strncpy(step->highlight, "combat_block", 31);
    strncpy(step->action, "block_test", 31);
    step->completed = false;
    
    // Step 4: Roll and Dodge
    step = &tutorial->steps[3];
    step->id = 3;
    step->type = TUTORIAL_INSTRUCTION;
    strncpy(step->title, "Roll and Dodge", MAX_TUTORIAL_NAME_LENGTH - 1);
    strncpy(step->content, "Press Roll to dodge attacks and move quickly", MAX_TUTORIAL_CONTENT_LENGTH - 1);
    strncpy(step->highlight, "combat_roll", 31);
    strncpy(step->action, "roll_test", 31);
    step->completed = false;
    
    // Step 5: Special Move
    step = &tutorial->steps[4];
    step->id = 4;
    step->type = TUTORIAL_INSTRUCTION;
    strncpy(step->title, "Special Move", MAX_TUTORIAL_NAME_LENGTH - 1);
    strncpy(step->content, "Press Special for your character's unique ability", MAX_TUTORIAL_CONTENT_LENGTH - 1);
    strncpy(step->highlight, "combat_special", 31);
    strncpy(step->action, "special_test", 31);
    step->completed = false;
    
    // Step 6: Completion
    step = &tutorial->steps[5];
    step->id = 5;
    step->type = TUTORIAL_COMPLETION;
    strncpy(step->title, "Combat Mastery", MAX_TUTORIAL_NAME_LENGTH - 1);
    strncpy(step->content, "Excellent! You've learned the combat basics", MAX_TUTORIAL_CONTENT_LENGTH - 1);
    strncpy(step->highlight, "none", 31);
    strncpy(step->action, "none", 31);
    step->completed = false;
    
    g_tutorial_count++;
}

void initialize_choose_tutorial() {
    Tutorial* tutorial = &g_tutorials[g_tutorial_count];
    tutorial->id = 2;
    strncpy(tutorial->name, "Choice Phase", MAX_TUTORIAL_NAME_LENGTH - 1);
    strncpy(tutorial->description, "Learn about the choice system and upgrades", MAX_TUTORIAL_CONTENT_LENGTH - 1);
    tutorial->stepCount = 5;
    tutorial->completed = false;
    
    // Step 1: Choice Introduction
    TutorialStep* step = &tutorial->steps[0];
    step->id = 0;
    step->type = TUTORIAL_INSTRUCTION;
    strncpy(step->title, "Making Choices", MAX_TUTORIAL_NAME_LENGTH - 1);
    strncpy(step->content, "After defeating enemies, you'll be offered choices", MAX_TUTORIAL_CONTENT_LENGTH - 1);
    strncpy(step->highlight, "choice_system", 31);
    strncpy(step->action, "show_choices", 31);
    step->completed = false;
    
    // Step 2: Choice Types
    step = &tutorial->steps[1];
    step->id = 1;
    step->type = TUTORIAL_INSTRUCTION;
    strncpy(step->title, "Choice Types", MAX_TUTORIAL_NAME_LENGTH - 1);
    strncpy(step->content, "Safe (green), Spicy (red), Weird (blue) choices", MAX_TUTORIAL_CONTENT_LENGTH - 1);
    strncpy(step->highlight, "choice_types", 31);
    strncpy(step->action, "explain_types", 31);
    step->completed = false;
    
    // Step 3: Choice Rarity
    step = &tutorial->steps[2];
    step->id = 2;
    step->type = TUTORIAL_INSTRUCTION;
    strncpy(step->title, "Choice Rarity", MAX_TUTORIAL_NAME_LENGTH - 1);
    strncpy(step->content, "Common, Uncommon, Rare, Legendary - rarer is better", MAX_TUTORIAL_CONTENT_LENGTH - 1);
    strncpy(step->highlight, "choice_rarity", 31);
    strncpy(step->action, "explain_rarity", 31);
    step->completed = false;
    
    // Step 4: Choice Selection
    step = &tutorial->steps[3];
    step->id = 3;
    step->type = TUTORIAL_INSTRUCTION;
    strncpy(step->title, "Selecting Choices", MAX_TUTORIAL_NAME_LENGTH - 1);
    strncpy(step->content, "Click on a choice to select it - only one per round", MAX_TUTORIAL_CONTENT_LENGTH - 1);
    strncpy(step->highlight, "choice_selection", 31);
    strncpy(step->action, "select_choice", 31);
    step->completed = false;
    
    // Step 5: Completion
    step = &tutorial->steps[4];
    step->id = 4;
    step->type = TUTORIAL_COMPLETION;
    strncpy(step->title, "Choice Mastery", MAX_TUTORIAL_NAME_LENGTH - 1);
    strncpy(step->content, "Perfect! You understand the choice system", MAX_TUTORIAL_CONTENT_LENGTH - 1);
    strncpy(step->highlight, "none", 31);
    strncpy(step->action, "none", 31);
    step->completed = false;
    
    g_tutorial_count++;
}

void initialize_powerup_tutorial() {
    Tutorial* tutorial = &g_tutorials[g_tutorial_count];
    tutorial->id = 3;
    strncpy(tutorial->name, "Power-Up Phase", MAX_TUTORIAL_NAME_LENGTH - 1);
    strncpy(tutorial->description, "Learn about power-ups and temporary boosts", MAX_TUTORIAL_CONTENT_LENGTH - 1);
    tutorial->stepCount = 4;
    tutorial->completed = false;
    
    // Step 1: Power-Up Introduction
    TutorialStep* step = &tutorial->steps[0];
    step->id = 0;
    step->type = TUTORIAL_INSTRUCTION;
    strncpy(step->title, "Power-Ups Available", MAX_TUTORIAL_NAME_LENGTH - 1);
    strncpy(step->content, "Power-ups are temporary boosts for your abilities", MAX_TUTORIAL_CONTENT_LENGTH - 1);
    strncpy(step->highlight, "powerup_system", 31);
    strncpy(step->action, "show_powerups", 31);
    step->completed = false;
    
    // Step 2: Power-Up Types
    step = &tutorial->steps[1];
    step->id = 1;
    step->type = TUTORIAL_INSTRUCTION;
    strncpy(step->title, "Power-Up Types", MAX_TUTORIAL_NAME_LENGTH - 1);
    strncpy(step->content, "Damage boost, speed boost, defense boost, special abilities", MAX_TUTORIAL_CONTENT_LENGTH - 1);
    strncpy(step->highlight, "powerup_types", 31);
    strncpy(step->action, "explain_powerup_types", 31);
    step->completed = false;
    
    // Step 3: Power-Up Duration
    step = &tutorial->steps[2];
    step->id = 2;
    step->type = TUTORIAL_INSTRUCTION;
    strncpy(step->title, "Power-Up Duration", MAX_TUTORIAL_NAME_LENGTH - 1);
    strncpy(step->content, "Power-ups last for a limited time - use them strategically", MAX_TUTORIAL_CONTENT_LENGTH - 1);
    strncpy(step->highlight, "powerup_duration", 31);
    strncpy(step->action, "show_duration", 31);
    step->completed = false;
    
    // Step 4: Completion
    step = &tutorial->steps[3];
    step->id = 3;
    step->type = TUTORIAL_COMPLETION;
    strncpy(step->title, "Power-Up Mastery", MAX_TUTORIAL_NAME_LENGTH - 1);
    strncpy(step->content, "Great! You understand power-ups", MAX_TUTORIAL_CONTENT_LENGTH - 1);
    strncpy(step->highlight, "none", 31);
    strncpy(step->action, "none", 31);
    step->completed = false;
    
    g_tutorial_count++;
}

void initialize_risk_tutorial() {
    Tutorial* tutorial = &g_tutorials[g_tutorial_count];
    tutorial->id = 4;
    strncpy(tutorial->name, "Risk Phase", MAX_TUTORIAL_NAME_LENGTH - 1);
    strncpy(tutorial->description, "Learn about risk and reward mechanics", MAX_TUTORIAL_CONTENT_LENGTH - 1);
    tutorial->stepCount = 5;
    tutorial->completed = false;
    
    // Step 1: Risk Introduction
    TutorialStep* step = &tutorial->steps[0];
    step->id = 0;
    step->type = TUTORIAL_INSTRUCTION;
    strncpy(step->title, "Risk Phase", MAX_TUTORIAL_NAME_LENGTH - 1);
    strncpy(step->content, "The Risk phase offers high rewards but comes with danger", MAX_TUTORIAL_CONTENT_LENGTH - 1);
    strncpy(step->highlight, "risk_system", 31);
    strncpy(step->action, "show_risk", 31);
    step->completed = false;
    
    // Step 2: Risk Levels
    step = &tutorial->steps[1];
    step->id = 1;
    step->type = TUTORIAL_INSTRUCTION;
    strncpy(step->title, "Risk Levels", MAX_TUTORIAL_NAME_LENGTH - 1);
    strncpy(step->content, "Low risk = small rewards, High risk = big rewards", MAX_TUTORIAL_CONTENT_LENGTH - 1);
    strncpy(step->highlight, "risk_levels", 31);
    strncpy(step->action, "explain_risk_levels", 31);
    step->completed = false;
    
    // Step 3: Risk Rewards
    step = &tutorial->steps[2];
    step->id = 2;
    step->type = TUTORIAL_INSTRUCTION;
    strncpy(step->title, "Risk Rewards", MAX_TUTORIAL_NAME_LENGTH - 1);
    strncpy(step->content, "Higher risk means better loot, more gold, rare items", MAX_TUTORIAL_CONTENT_LENGTH - 1);
    strncpy(step->highlight, "risk_rewards", 31);
    strncpy(step->action, "show_risk_rewards", 31);
    step->completed = false;
    
    // Step 4: Risk Escape
    step = &tutorial->steps[3];
    step->id = 3;
    step->type = TUTORIAL_INSTRUCTION;
    strncpy(step->title, "Escaping Risk", MAX_TUTORIAL_NAME_LENGTH - 1);
    strncpy(step->content, "You can escape the Risk phase early if it gets too dangerous", MAX_TUTORIAL_CONTENT_LENGTH - 1);
    strncpy(step->highlight, "risk_escape", 31);
    strncpy(step->action, "show_escape", 31);
    step->completed = false;
    
    // Step 5: Completion
    step = &tutorial->steps[4];
    step->id = 4;
    step->type = TUTORIAL_COMPLETION;
    strncpy(step->title, "Risk Mastery", MAX_TUTORIAL_NAME_LENGTH - 1);
    strncpy(step->content, "Excellent! You understand risk and reward", MAX_TUTORIAL_CONTENT_LENGTH - 1);
    strncpy(step->highlight, "none", 31);
    strncpy(step->action, "none", 31);
    step->completed = false;
    
    g_tutorial_count++;
}

void initialize_escalate_tutorial() {
    Tutorial* tutorial = &g_tutorials[g_tutorial_count];
    tutorial->id = 5;
    strncpy(tutorial->name, "Escalation Phase", MAX_TUTORIAL_NAME_LENGTH - 1);
    strncpy(tutorial->description, "Learn about escalation and increasing difficulty", MAX_TUTORIAL_CONTENT_LENGTH - 1);
    tutorial->stepCount = 4;
    tutorial->completed = false;
    
    // Step 1: Escalation Introduction
    TutorialStep* step = &tutorial->steps[0];
    step->id = 0;
    step->type = TUTORIAL_INSTRUCTION;
    strncpy(step->title, "Escalation Phase", MAX_TUTORIAL_NAME_LENGTH - 1);
    strncpy(step->content, "The Escalation phase increases difficulty but offers better rewards", MAX_TUTORIAL_CONTENT_LENGTH - 1);
    strncpy(step->highlight, "escalate_system", 31);
    strncpy(step->action, "show_escalation", 31);
    step->completed = false;
    
    // Step 2: Escalation Difficulty
    step = &tutorial->steps[1];
    step->id = 1;
    step->type = TUTORIAL_INSTRUCTION;
    strncpy(step->title, "Increasing Difficulty", MAX_TUTORIAL_NAME_LENGTH - 1);
    strncpy(step->content, "Enemies become stronger, faster, and more numerous", MAX_TUTORIAL_CONTENT_LENGTH - 1);
    strncpy(step->highlight, "escalate_difficulty", 31);
    strncpy(step->action, "show_difficulty_increase", 31);
    step->completed = false;
    
    // Step 3: Escalation Rewards
    step = &tutorial->steps[2];
    step->id = 2;
    step->type = TUTORIAL_INSTRUCTION;
    strncpy(step->title, "Escalation Rewards", MAX_TUTORIAL_NAME_LENGTH - 1);
    strncpy(step->content, "Better rewards await those who survive the escalation", MAX_TUTORIAL_CONTENT_LENGTH - 1);
    strncpy(step->highlight, "escalate_rewards", 31);
    strncpy(step->action, "show_escalation_rewards", 31);
    step->completed = false;
    
    // Step 4: Completion
    step = &tutorial->steps[3];
    step->id = 3;
    step->type = TUTORIAL_COMPLETION;
    strncpy(step->title, "Escalation Mastery", MAX_TUTORIAL_NAME_LENGTH - 1);
    strncpy(step->content, "Outstanding! You understand escalation", MAX_TUTORIAL_CONTENT_LENGTH - 1);
    strncpy(step->highlight, "none", 31);
    strncpy(step->action, "none", 31);
    step->completed = false;
    
    g_tutorial_count++;
}

void initialize_cashout_tutorial() {
    Tutorial* tutorial = &g_tutorials[g_tutorial_count];
    tutorial->id = 6;
    strncpy(tutorial->name, "Cash-Out Phase", MAX_TUTORIAL_NAME_LENGTH - 1);
    strncpy(tutorial->description, "Learn about cashing out and managing rewards", MAX_TUTORIAL_CONTENT_LENGTH - 1);
    tutorial->stepCount = 5;
    tutorial->completed = false;
    
    // Step 1: Cash-Out Introduction
    TutorialStep* step = &tutorial->steps[0];
    step->id = 0;
    step->type = TUTORIAL_INSTRUCTION;
    strncpy(step->title, "Cash-Out Phase", MAX_TUTORIAL_NAME_LENGTH - 1);
    strncpy(step->content, "The Cash-Out phase lets you spend your hard-earned rewards", MAX_TUTORIAL_CONTENT_LENGTH - 1);
    strncpy(step->highlight, "cashout_system", 31);
    strncpy(step->action, "show_cashout", 31);
    step->completed = false;
    
    // Step 2: Shopping
    step = &tutorial->steps[1];
    step->id = 1;
    step->type = TUTORIAL_INSTRUCTION;
    strncpy(step->title, "Shopping", MAX_TUTORIAL_NAME_LENGTH - 1);
    strncpy(step->content, "Use your gold to buy weapons, armor, and items", MAX_TUTORIAL_CONTENT_LENGTH - 1);
    strncpy(step->highlight, "cashout_shop", 31);
    strncpy(step->action, "show_shop", 31);
    step->completed = false;
    
    // Step 3: Upgrades
    step = &tutorial->steps[2];
    step->id = 2;
    step->type = TUTORIAL_INSTRUCTION;
    strncpy(step->title, "Upgrades", MAX_TUTORIAL_NAME_LENGTH - 1);
    strncpy(step->content, "Spend essence on permanent upgrades", MAX_TUTORIAL_CONTENT_LENGTH - 1);
    strncpy(step->highlight, "cashout_upgrades", 31);
    strncpy(step->action, "show_upgrades", 31);
    step->completed = false;
    
    // Step 4: Saving Progress
    step = &tutorial->steps[3];
    step->id = 3;
    step->type = TUTORIAL_INSTRUCTION;
    strncpy(step->title, "Saving Progress", MAX_TUTORIAL_NAME_LENGTH - 1);
    strncpy(step->content, "Your progress is automatically saved", MAX_TUTORIAL_CONTENT_LENGTH - 1);
    strncpy(step->highlight, "cashout_save", 31);
    strncpy(step->action, "show_save", 31);
    step->completed = false;
    
    // Step 5: Completion
    step = &tutorial->steps[4];
    step->id = 4;
    step->type = TUTORIAL_COMPLETION;
    strncpy(step->title, "Cash-Out Mastery", MAX_TUTORIAL_NAME_LENGTH - 1);
    strncpy(step->content, "Perfect! You understand the cash-out system", MAX_TUTORIAL_CONTENT_LENGTH - 1);
    strncpy(step->highlight, "none", 31);
    strncpy(step->action, "none", 31);
    step->completed = false;
    
    g_tutorial_count++;
}

void initialize_reset_tutorial() {
    Tutorial* tutorial = &g_tutorials[g_tutorial_count];
    tutorial->id = 7;
    strncpy(tutorial->name, "Reset Phase", MAX_TUTORIAL_NAME_LENGTH - 1);
    strncpy(tutorial->description, "Learn about resetting and starting over", MAX_TUTORIAL_CONTENT_LENGTH - 1);
    tutorial->stepCount = 4;
    tutorial->completed = false;
    
    // Step 1: Reset Introduction
    TutorialStep* step = &tutorial->steps[0];
    step->id = 0;
    step->type = TUTORIAL_INSTRUCTION;
    strncpy(step->title, "Reset Phase", MAX_TUTORIAL_NAME_LENGTH - 1);
    strncpy(step->content, "The Reset phase prepares you for the next run", MAX_TUTORIAL_CONTENT_LENGTH - 1);
    strncpy(step->highlight, "reset_system", 31);
    strncpy(step->action, "show_reset", 31);
    step->completed = false;
    
    // Step 2: Progress Preservation
    step = &tutorial->steps[1];
    step->id = 1;
    step->type = TUTORIAL_INSTRUCTION;
    strncpy(step->title, "Progress Preservation", MAX_TUTORIAL_NAME_LENGTH - 1);
    strncpy(step->content, "Your achievements and statistics are saved permanently", MAX_TUTORIAL_CONTENT_LENGTH - 1);
    strncpy(step->highlight, "reset_progress", 31);
    strncpy(step->action, "show_progress_preservation", 31);
    step->completed = false;
    
    // Step 3: New Run
    step = &tutorial->steps[2];
    step->id = 2;
    step->type = TUTORIAL_INSTRUCTION;
    strncpy(step->title, "Starting New Run", MAX_TUTORIAL_NAME_LENGTH - 1);
    strncpy(step->content, "Each new run offers fresh challenges and opportunities", MAX_TUTORIAL_CONTENT_LENGTH - 1);
    strncpy(step->highlight, "reset_new_run", 31);
    strncpy(step->action, "show_new_run", 31);
    step->completed = false;
    
    // Step 4: Completion
    step = &tutorial->steps[3];
    step->id = 3;
    step->type = TUTORIAL_COMPLETION;
    strncpy(step->title, "Reset Mastery", MAX_TUTORIAL_NAME_LENGTH - 1);
    strncpy(step->content, "Excellent! You understand the reset system", MAX_TUTORIAL_CONTENT_LENGTH - 1);
    strncpy(step->highlight, "none", 31);
    strncpy(step->action, "none", 31);
    step->completed = false;
    
    g_tutorial_count++;
}

// ============================================================================
// Tutorial Management Functions
// ============================================================================

void start_tutorial(uint32_t tutorialId) {
    if (tutorialId >= g_tutorial_count) return;
    
    g_current_tutorial = tutorialId;
    g_current_step = 0;
    g_tutorial_active = true;
    
    Tutorial* tutorial = &g_tutorials[tutorialId];
    tutorial->startTime = (uint64_t)(g_time_seconds * 1000);
    tutorial->completed = false;
    
    // Reset all steps
    for (uint32_t i = 0; i < tutorial->stepCount; i++) {
        tutorial->steps[i].completed = false;
    }
}

void next_tutorial_step() {
    if (!g_tutorial_active) return;
    
    Tutorial* tutorial = &g_tutorials[g_current_tutorial];
    
    if (g_current_step < tutorial->stepCount - 1) {
        g_current_step++;
    } else {
        complete_tutorial();
    }
}

void previous_tutorial_step() {
    if (!g_tutorial_active || g_current_step == 0) return;
    
    g_current_step--;
}

void complete_tutorial() {
    if (!g_tutorial_active) return;
    
    Tutorial* tutorial = &g_tutorials[g_current_tutorial];
    tutorial->completed = true;
    tutorial->endTime = (uint64_t)(g_time_seconds * 1000);
    
    g_tutorial_active = false;
    g_current_tutorial = 0;
    g_current_step = 0;
}

void skip_tutorial() {
    if (!g_tutorial_active) return;
    
    Tutorial* tutorial = &g_tutorials[g_current_tutorial];
    tutorial->completed = true;
    tutorial->endTime = (uint64_t)(g_time_seconds * 1000);
    
    g_tutorial_active = false;
    g_current_tutorial = 0;
    g_current_step = 0;
}

// ============================================================================
// WASM Export Functions
// ============================================================================

/**
 * Get tutorial count
 */
__attribute__((export_name("get_tutorial_count")))
uint32_t get_tutorial_count() {
    return g_tutorial_count;
}

/**
 * Get tutorial info by ID
 */
__attribute__((export_name("get_tutorial_info")))
const char* get_tutorial_info(uint32_t tutorialId) {
    static char tutorialBuffer[512];
    
    if (tutorialId >= g_tutorial_count) {
        strcpy(tutorialBuffer, "Invalid tutorial ID");
        return tutorialBuffer;
    }
    
    Tutorial* tutorial = &g_tutorials[tutorialId];
    
    snprintf(tutorialBuffer, sizeof(tutorialBuffer),
        "{"
        "\"id\":%d,"
        "\"name\":\"%s\","
        "\"description\":\"%s\","
        "\"stepCount\":%d,"
        "\"completed\":%s,"
        "\"startTime\":%llu,"
        "\"endTime\":%llu"
        "}",
        tutorial->id,
        tutorial->name,
        tutorial->description,
        tutorial->stepCount,
        tutorial->completed ? "true" : "false",
        tutorial->startTime,
        tutorial->endTime
    );
    
    return tutorialBuffer;
}

/**
 * Get current tutorial step info
 */
__attribute__((export_name("get_current_tutorial_step")))
const char* get_current_tutorial_step() {
    static char stepBuffer[512];
    
    if (!g_tutorial_active) {
        strcpy(stepBuffer, "No active tutorial");
        return stepBuffer;
    }
    
    Tutorial* tutorial = &g_tutorials[g_current_tutorial];
    TutorialStep* step = &tutorial->steps[g_current_step];
    
    snprintf(stepBuffer, sizeof(stepBuffer),
        "{"
        "\"tutorialId\":%d,"
        "\"stepIndex\":%d,"
        "\"title\":\"%s\","
        "\"content\":\"%s\","
        "\"highlight\":\"%s\","
        "\"action\":\"%s\","
        "\"type\":%d,"
        "\"completed\":%s"
        "}",
        g_current_tutorial,
        g_current_step,
        step->title,
        step->content,
        step->highlight,
        step->action,
        step->type,
        step->completed ? "true" : "false"
    );
    
    return stepBuffer;
}

/**
 * Get tutorial status
 */
__attribute__((export_name("get_tutorial_status")))
const char* get_tutorial_status() {
    static char statusBuffer[256];
    
    snprintf(statusBuffer, sizeof(statusBuffer),
        "{"
        "\"active\":%s,"
        "\"currentTutorial\":%d,"
        "\"currentStep\":%d,"
        "\"enabled\":%s,"
        "\"autoStart\":%s,"
        "\"showTooltips\":%s,"
        "\"skipCompleted\":%s"
        "}",
        g_tutorial_active ? "true" : "false",
        g_current_tutorial,
        g_current_step,
        g_tutorial_enabled ? "true" : "false",
        g_auto_start_tutorials ? "true" : "false",
        g_show_tooltips ? "true" : "false",
        g_skip_completed_tutorials ? "true" : "false"
    );
    
    return statusBuffer;
}

/**
 * Start tutorial by ID
 */
__attribute__((export_name("start_tutorial_by_id")))
void start_tutorial_by_id(uint32_t tutorialId) {
    start_tutorial(tutorialId);
}

/**
 * Go to next tutorial step
 */
__attribute__((export_name("next_tutorial_step_export")))
void next_tutorial_step_export() {
    next_tutorial_step();
}

/**
 * Go to previous tutorial step
 */
__attribute__((export_name("previous_tutorial_step_export")))
void previous_tutorial_step_export() {
    previous_tutorial_step();
}

/**
 * Complete current tutorial
 */
__attribute__((export_name("complete_tutorial_export")))
void complete_tutorial_export() {
    complete_tutorial();
}

/**
 * Skip current tutorial
 */
__attribute__((export_name("skip_tutorial_export")))
void skip_tutorial_export() {
    skip_tutorial();
}

/**
 * Enable/disable tutorials
 */
__attribute__((export_name("set_tutorial_enabled")))
void set_tutorial_enabled(bool enabled) {
    g_tutorial_enabled = enabled;
}

/**
 * Set tutorial settings
 */
__attribute__((export_name("set_tutorial_settings")))
void set_tutorial_settings(bool autoStart, bool showTooltips, bool skipCompleted) {
    g_auto_start_tutorials = autoStart;
    g_show_tooltips = showTooltips;
    g_skip_completed_tutorials = skipCompleted;
}