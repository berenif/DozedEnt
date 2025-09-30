#include "GameGlobals.h"
#include "coordinators/GameCoordinator.h"

// Global coordinator instance (temporary during refactoring)
GameCoordinator* g_game_coordinator = nullptr;

// Temporary globals (to be removed as refactoring progresses)
bool g_is_stunned = false;
float g_stamina = 1.0f;

