#pragma once

#include "../../generated/balance_data.h"

namespace wolves {
namespace constants {
    constexpr float PI = 3.14159265359f;
    constexpr float BASE_WOLF_SPEED = 0.25f;
    constexpr float WOLF_FRICTION = 12.0f;
    constexpr float ATTACK_ANTICIPATION_TIME = 0.3f;
    constexpr float ATTACK_EXECUTE_TIME = 0.2f;
    constexpr float ATTACK_RECOVERY_TIME = 0.3f;

#ifdef BAL_WOLF_ATTACK_FACING_COS
    constexpr float ATTACK_FACING_COS_THRESHOLD = BAL_WOLF_ATTACK_FACING_COS;
#else
    constexpr float ATTACK_FACING_COS_THRESHOLD = 0.5f;
#endif

#ifdef BAL_WOLF_DAMAGE_INTERRUPT_THRESHOLD
    constexpr float DAMAGE_INTERRUPT_THRESHOLD = BAL_WOLF_DAMAGE_INTERRUPT_THRESHOLD;
#else
    constexpr float DAMAGE_INTERRUPT_THRESHOLD = 6.0f;
#endif
}
}

