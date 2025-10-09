#include "AbilityUpgradeSystem.h"
#include <string>
#include <vector>
#include <sstream>
#include <cstring>

// Minimal JSON parsing helpers (expect well-formed data produced by our own JSONs)
// For production you might integrate a proper JSON lib, but keep binary size tight.

static std::string slice(const char* s, int len) { return std::string(s, s + len); }

AbilityUpgradeSystem::AbilityUpgradeSystem() {}

UpgradeTree* AbilityUpgradeSystem::ensureTree(int classIdInt) {
	auto it = trees.find(classIdInt);
	if (it != trees.end()) return it->second.get();
	auto up = std::make_unique<UpgradeTree>();
	UpgradeTree* ptr = up.get();
	trees[classIdInt] = std::move(up);
	return ptr;
}

// NOTE: For brevity, JSON parsing here is skeletal; in the real project, prefer a small JSON lib.
// We only need fields used by our data files.
static void parseTreeJson(UpgradeTree& tree, const std::string& json) {
	// Reset
	tree.nodes.clear();
	tree.state.clear();
	tree.externalToNumeric.clear();
	tree.essence = 0;

	// Extremely simplified extraction: search for nodes array and iterate entries.
	// Each node: id,title,description,cost,maxLevel,requires(effect omitted types),effect{type,key,perLevel},tier
	// We assume IDs are small; assign numeric in insertion order

	size_t pos = json.find("\"nodes\"");
	if (pos == std::string::npos) return;
	pos = json.find('[', pos);
	if (pos == std::string::npos) return;
	size_t end = json.find(']', pos);
	if (end == std::string::npos) return;
	std::string arr = json.substr(pos + 1, end - pos - 1);

	// Split by '},{' naïvely
	size_t start = 0; int numeric = 0;
	while (start < arr.size()) {
		size_t next = arr.find("},{", start);
		std::string entry = arr.substr(start, (next == std::string::npos ? arr.size() : next) - start);
		// Extract fields
		UpgradeNodeDef def{};
		def.id = numeric;
		// id
		size_t idp = entry.find("\"id\"");
		if (idp != std::string::npos) {
			size_t q1 = entry.find('"', idp + 4);
			size_t q2 = entry.find('"', q1 + 1);
			def.externalId = entry.substr(q1 + 1, q2 - q1 - 1);
		}
		// title
		size_t tp = entry.find("\"title\"");
		if (tp != std::string::npos) {
			size_t q1 = entry.find('"', tp + 7);
			size_t q2 = entry.find('"', q1 + 1);
			def.title = entry.substr(q1 + 1, q2 - q1 - 1);
		}
		// description
		size_t dp = entry.find("\"description\"");
		if (dp != std::string::npos) {
			size_t q1 = entry.find('"', dp + 13);
			size_t q2 = entry.find('"', q1 + 1);
			def.description = entry.substr(q1 + 1, q2 - q1 - 1);
		}
		// cost
		size_t cp = entry.find("\"cost\"");
		if (cp != std::string::npos) {
			size_t colon = entry.find(':', cp);
			size_t comma = entry.find(',', colon);
			def.cost = std::stoi(entry.substr(colon + 1, comma - colon - 1));
		}
		// maxLevel
		size_t mp = entry.find("\"maxLevel\"");
		if (mp != std::string::npos) {
			size_t colon = entry.find(':', mp);
			size_t comma = entry.find(',', colon);
			def.maxLevel = std::stoi(entry.substr(colon + 1, comma - colon - 1));
		}
		// tier
		size_t trp = entry.find("\"tier\"");
		if (trp != std::string::npos) {
			size_t colon = entry.find(':', trp);
			size_t comma = entry.find(',', colon);
			def.tier = std::stoi(entry.substr(colon + 1, (comma==std::string::npos? entry.size(): comma) - colon - 1));
		}
		// effect.key
		size_t ek = entry.find("\"key\"");
		if (ek != std::string::npos) {
			size_t q1 = entry.find('"', ek + 5);
			size_t q2 = entry.find('"', q1 + 1);
			def.effect.key = entry.substr(q1 + 1, q2 - q1 - 1);
		}
		// effect.perLevel (float or int)
		size_t ep = entry.find("\"perLevel\"");
		if (ep != std::string::npos) {
			size_t colon = entry.find(':', ep);
			size_t comma = entry.find(',', colon);
			std::string val = entry.substr(colon + 1, (comma==std::string::npos? entry.size(): comma) - colon - 1);
			if (val.find('.') != std::string::npos) {
				def.effect.perLevelFix = (int)(std::stod(val) * 65536.0);
			} else {
				def.effect.perLevelFix = std::stoi(val) * 65536; // integer -> 16.16
			}
		}
		// requires array: very minimal (expect identifiers that map later by external id; we cannot resolve here without map)
		// We defer resolving requires until after all nodes are known; temporarily store in description tail (skipped for simplicity)

		tree.externalToNumeric[def.externalId] = def.id;
		tree.nodes.push_back(def);
		tree.state.push_back(UpgradeNodeState{});
		numeric++;
		if (next == std::string::npos) break;
		start = next + 2; // skip '},'
	}

	// Second pass for requires: we perform a rough parse of requires arrays
	start = 0; numeric = 0;
	while (start < arr.size()) {
		size_t next = arr.find("},{", start);
		std::string entry = arr.substr(start, (next == std::string::npos ? arr.size() : next) - start);
		size_t rp = entry.find("\"requires\"");
		if (rp != std::string::npos) {
			size_t lb = entry.find('[', rp);
			size_t rb = entry.find(']', lb);
			if (lb != std::string::npos && rb != std::string::npos) {
				std::string list = entry.substr(lb + 1, rb - lb - 1);
				size_t sp = 0;
				while (sp < list.size()) {
					size_t q1 = list.find('"', sp);
					if (q1 == std::string::npos) break;
					size_t q2 = list.find('"', q1 + 1);
					if (q2 == std::string::npos) break;
					std::string ext = list.substr(q1 + 1, q2 - q1 - 1);
					auto it = tree.externalToNumeric.find(ext);
					if (it != tree.externalToNumeric.end()) tree.nodes[numeric].requires.push_back(it->second);
					sp = q2 + 1;
				}
			}
		}
		numeric++;
		if (next == std::string::npos) break;
		start = next + 2;
	}
}

static std::string stateToJson(const UpgradeTree& tree) {
	std::ostringstream os;
	os << "{\"schemaVersion\":1,\"classId\":\"" << tree.classId << "\",\"essence\":" << tree.essence << ",\"nodes\":{";
	for (size_t i = 0; i < tree.nodes.size(); ++i) {
		const auto& def = tree.nodes[i];
		const auto& st = tree.state[i];
		if (i) os << ",";
		os << "\"" << def.externalId << "\":" << st.level;
	}
	os << "}}";
	return os.str();
}

static void applyStateJson(UpgradeTree& tree, const std::string& json) {
	// Pull essence and node levels
	size_t ep = json.find("\"essence\"");
	if (ep != std::string::npos) {
		size_t colon = json.find(':', ep);
		size_t comma = json.find(',', colon);
		tree.essence = std::stoi(json.substr(colon + 1, (comma==std::string::npos? json.size(): comma) - colon - 1));
	}
	// nodes object
	size_t np = json.find("\"nodes\"");
	if (np != std::string::npos) {
		size_t lb = json.find('{', np);
		size_t rb = json.find('}', lb);
		if (lb != std::string::npos && rb != std::string::npos) {
			std::string body = json.substr(lb + 1, rb - lb - 1);
			size_t sp = 0;
			while (sp < body.size()) {
				size_t q1 = body.find('"', sp);
				if (q1 == std::string::npos) break;
				size_t q2 = body.find('"', q1 + 1);
				if (q2 == std::string::npos) break;
				std::string ext = body.substr(q1 + 1, q2 - q1 - 1);
				size_t colon = body.find(':', q2);
				size_t comma = body.find(',', colon);
				int level = std::stoi(body.substr(colon + 1, (comma==std::string::npos? body.size(): comma) - colon - 1));
				auto it = tree.externalToNumeric.find(ext);
				if (it != tree.externalToNumeric.end()) {
					int idx = it->second;
					if (idx >= 0 && idx < (int)tree.state.size()) tree.state[idx].level = level;
				}
				if (comma == std::string::npos) break;
				sp = comma + 1;
			}
		}
	}
}

void AbilityUpgradeSystem::setTreeJson(int classIdInt, const std::string& json) {
	UpgradeTree* t = ensureTree(classIdInt);
	parseTreeJson(*t, json);
	// extract classId string
	size_t cp = json.find("\"classId\"");
	if (cp != std::string::npos) {
		size_t q1 = json.find('"', cp + 8);
		size_t q2 = json.find('"', q1 + 1);
		if (q1 != std::string::npos && q2 != std::string::npos) t->classId = json.substr(q1 + 1, q2 - q1 - 1);
	}
}

void AbilityUpgradeSystem::setStateJson(int classIdInt, const std::string& json) {
	UpgradeTree* t = ensureTree(classIdInt);
	applyStateJson(*t, json);
}

std::string AbilityUpgradeSystem::getStateJson(int classIdInt) const {
	auto it = trees.find(classIdInt);
	if (it == trees.end()) return "{}";
	return stateToJson(*it->second);
}

int AbilityUpgradeSystem::getEssence(int classIdInt) const {
	auto it = trees.find(classIdInt);
	if (it == trees.end()) return 0;
	return it->second->essence;
}

int AbilityUpgradeSystem::canPurchase(int classIdInt, int nodeId) const {
	auto it = trees.find(classIdInt);
	if (it == trees.end()) return 1;
	int code = 0;
	it->second->canPurchase(nodeId, &code);
	return code; // 0 means ok
}

void AbilityUpgradeSystem::addEssence(int classIdInt, int delta) {
	UpgradeTree* t = ensureTree(classIdInt);
	long long v = (long long)t->essence + (long long)delta;
	if (v < 0) v = 0;
	if (v > 2147483647LL) v = 2147483647LL;
	t->essence = (int)v;
}

int AbilityUpgradeSystem::purchase(int classIdInt, int nodeId) {
	UpgradeTree* t = ensureTree(classIdInt);
	if (t->purchase(nodeId)) return 0;
	int code = 0; t->canPurchase(nodeId, &code);
	return code ? code : 9;
}

void AbilityUpgradeSystem::resetClass(int classIdInt) {
	UpgradeTree* t = ensureTree(classIdInt);
	for (auto& s : t->state) s.level = 0;
	t->essence = 0;
}

int AbilityUpgradeSystem::getEffectScalarFix(int classIdInt, const std::string& key) const {
	auto it = trees.find(classIdInt);
	if (it == trees.end()) return 0;
	return it->second->getScalarFix(key);
}

// ---- C API glue ----
static AbilityUpgradeSystem g_sys;
static std::string g_lastJson;

extern "C" {
	__attribute__((used)) __attribute__((export_name("upgrade_create_system")))
	int upgrade_create_system() { return 1; }
	__attribute__((used)) __attribute__((export_name("upgrade_set_tree")))
	void upgrade_set_tree(int classId, const char* jsonPtr, int len) {
		g_sys.setTreeJson(classId, std::string(jsonPtr, jsonPtr + len));
	}
	__attribute__((used)) __attribute__((export_name("upgrade_set_state")))
	void upgrade_set_state(int classId, const char* jsonPtr, int len) {
		g_sys.setStateJson(classId, std::string(jsonPtr, jsonPtr + len));
	}
	__attribute__((used)) __attribute__((export_name("upgrade_get_state")))
	const char* upgrade_get_state(int classId) {
		g_lastJson = g_sys.getStateJson(classId);
		return g_lastJson.c_str();
	}
	__attribute__((used)) __attribute__((export_name("upgrade_get_essence")))
	int upgrade_get_essence(int classId) { return g_sys.getEssence(classId); }
	__attribute__((used)) __attribute__((export_name("upgrade_can_purchase")))
	int upgrade_can_purchase(int classId, int nodeId) { return g_sys.canPurchase(classId, nodeId); }
	__attribute__((used)) __attribute__((export_name("upgrade_add_essence")))
	void upgrade_add_essence(int classId, int delta) { g_sys.addEssence(classId, delta); }
	__attribute__((used)) __attribute__((export_name("upgrade_purchase")))
	int upgrade_purchase(int classId, int nodeId) { return g_sys.purchase(classId, nodeId); }
	__attribute__((used)) __attribute__((export_name("upgrade_reset_class")))
	void upgrade_reset_class(int classId) { g_sys.resetClass(classId); }
	__attribute__((used)) __attribute__((export_name("upgrade_get_effect_scalar")))
	int upgrade_get_effect_scalar(int classId, const char* key, int len) {
		return g_sys.getEffectScalarFix(classId, std::string(key, key + len));
	}
}


