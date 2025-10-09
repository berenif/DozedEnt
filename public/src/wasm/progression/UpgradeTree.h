#pragma once

#include <string>
#include <unordered_map>
#include <vector>
#include "UpgradeNode.h"

class UpgradeTree {
public:
	std::string classId; // e.g., "warden"
	int version{1};
	std::vector<UpgradeNodeDef> nodes; // index => numeric id
	std::unordered_map<std::string, int> externalToNumeric; // external id -> numeric id
	std::vector<UpgradeNodeState> state; // parallel to nodes

	int essence{0};

	int findNumeric(const std::string& external) const {
		auto it = externalToNumeric.find(external);
		return it == externalToNumeric.end() ? -1 : it->second;
	}

	bool canPurchase(int nodeNumericId, int* outErrorCode = nullptr) const;
	bool purchase(int nodeNumericId);
	int getScalarFix(const std::string& key) const; // sum effects for key in 16.16 fixed
};


