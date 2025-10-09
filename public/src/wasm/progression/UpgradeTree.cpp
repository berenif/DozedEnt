#include "UpgradeTree.h"

static inline int toFixFromFloat(double v){ return (int)(v * 65536.0 + (v>=0?0.5:-0.5)); }

bool UpgradeTree::canPurchase(int nodeNumericId, int* outErrorCode) const {
	if (nodeNumericId < 0 || nodeNumericId >= (int)nodes.size()) { if (outErrorCode) *outErrorCode = 1; return false; }
	const UpgradeNodeDef& def = nodes[nodeNumericId];
	const UpgradeNodeState& st = state[nodeNumericId];
	if (st.level >= def.maxLevel) { if (outErrorCode) *outErrorCode = 2; return false; }
	for (int req : def.requires) {
		if (req < 0 || req >= (int)state.size()) { if (outErrorCode) *outErrorCode = 3; return false; }
		if (state[req].level <= 0) { if (outErrorCode) *outErrorCode = 4; return false; }
	}
	if (essence < def.cost) { if (outErrorCode) *outErrorCode = 5; return false; }
	return true;
}

bool UpgradeTree::purchase(int nodeNumericId) {
	int code = 0;
	if (!canPurchase(nodeNumericId, &code)) return false;
	UpgradeNodeDef& def = nodes[nodeNumericId];
	UpgradeNodeState& st = state[nodeNumericId];
	essence -= def.cost;
	st.level += 1;
	return true;
}

int UpgradeTree::getScalarFix(const std::string& key) const {
	long long accum = 0; // accumulate in 16.16
	for (size_t i = 0; i < nodes.size(); ++i) {
		const UpgradeNodeDef& def = nodes[i];
		const UpgradeNodeState& st = state[i];
		if (st.level <= 0) continue;
		if (def.effect.key == key) {
			long long contrib = (long long)def.effect.perLevelFix * (long long)st.level;
			accum += contrib;
		}
	}
	if (accum > 2147483647LL) accum = 2147483647LL;
	if (accum < -2147483648LL) accum = -2147483648LL;
	return (int)accum;
}


