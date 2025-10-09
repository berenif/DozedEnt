#pragma once

#include <string>
#include <unordered_map>
#include <memory>
#include "UpgradeTree.h"

class AbilityUpgradeSystem {
public:
	// classIdInt: 1=warden,2=raider,3=kensei
	std::unordered_map<int, std::unique_ptr<UpgradeTree>> trees;

	AbilityUpgradeSystem();
	~AbilityUpgradeSystem() = default;

	UpgradeTree* ensureTree(int classIdInt);

	void setTreeJson(int classIdInt, const std::string& json);
	void setStateJson(int classIdInt, const std::string& json);
	std::string getStateJson(int classIdInt) const;
	int getEssence(int classIdInt) const;
	int canPurchase(int classIdInt, int nodeId) const;
	void addEssence(int classIdInt, int delta);
	int purchase(int classIdInt, int nodeId);
	void resetClass(int classIdInt);
	int getEffectScalarFix(int classIdInt, const std::string& key) const;
};

// Exported C API (decl only; definitions placed in cpp for Emscripten)
extern "C" {
	int upgrade_create_system();
	void upgrade_set_tree(int classId, const char* jsonPtr, int len);
	void upgrade_set_state(int classId, const char* jsonPtr, int len);
	const char* upgrade_get_state(int classId);
	int upgrade_get_essence(int classId);
	int upgrade_can_purchase(int classId, int nodeId);
	void upgrade_add_essence(int classId, int delta);
	int upgrade_purchase(int classId, int nodeId);
	void upgrade_reset_class(int classId);
	int upgrade_get_effect_scalar(int classId, const char* key, int len);
}


