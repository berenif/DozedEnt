#pragma once

#include <string>
#include <vector>

struct UpgradeEffect {
	std::string type; // ability|economy|defense|...
	std::string key;  // e.g., "warden.bash.damage"
	int perLevelFix;  // 16.16 fixed-point value if fractional, or integer scaled
};

struct UpgradeNodeDef {
	int id; // internal numeric id (assigned by tree)
	std::string externalId; // JSON id, stable
	std::string title;
	std::string description;
	int cost; // essence cost per level
	int maxLevel;
	std::vector<int> requires; // numeric ids
	UpgradeEffect effect;
	int tier;
};

struct UpgradeNodeState {
	int level{0};
};


