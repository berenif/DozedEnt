/**
 * Animation utility functions
 */

export const toMilliseconds = (value) => {
    if (!Number.isFinite(value) || value <= 0) {
        return 0;
    }
    return value > 10 ? value : value * 1000;
};
