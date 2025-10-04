#pragma once
#include <cstdint>
#include <cmath>

/**
 * Fixed-point arithmetic for deterministic physics
 * Uses 16.16 fixed-point format (16 bits integer, 16 bits fractional)
 * Critical for multiplayer synchronization
 */
struct Fixed {
    int32_t raw;
    static constexpr int32_t SHIFT = 16;
    static constexpr int32_t ONE = 1 << SHIFT;
    static constexpr int32_t FRACTION_MASK = ONE - 1;
    
    // Constructors
    Fixed() : raw(0) {}
    explicit Fixed(int32_t r) : raw(r) {}
    
    // Conversion functions
    static Fixed from_int(int32_t i) { 
        return Fixed(i << SHIFT); 
    }
    
    static Fixed from_float(float f) { 
        return Fixed(static_cast<int32_t>(f * ONE)); 
    }
    
    float to_float() const { 
        return static_cast<float>(raw) / ONE; 
    }
    
    int32_t to_int() const {
        return raw >> SHIFT;
    }
    
    // Arithmetic operators
    Fixed operator+(Fixed o) const { 
        return Fixed(raw + o.raw); 
    }
    
    Fixed operator-(Fixed o) const { 
        return Fixed(raw - o.raw); 
    }
    
    Fixed operator-() const { 
        return Fixed(-raw); 
    }
    
    Fixed operator*(Fixed o) const { 
        return Fixed(static_cast<int32_t>((static_cast<int64_t>(raw) * o.raw) >> SHIFT)); 
    }
    
    Fixed operator/(Fixed o) const {
        if (o.raw == 0) {
            return Fixed(0); // Avoid division by zero
        }
        return Fixed(static_cast<int32_t>((static_cast<int64_t>(raw) << SHIFT) / o.raw));
    }
    
    // Comparison operators
    bool operator==(Fixed o) const { return raw == o.raw; }
    bool operator!=(Fixed o) const { return raw != o.raw; }
    bool operator<(Fixed o) const { return raw < o.raw; }
    bool operator>(Fixed o) const { return raw > o.raw; }
    bool operator<=(Fixed o) const { return raw <= o.raw; }
    bool operator>=(Fixed o) const { return raw >= o.raw; }
    
    // Compound assignment operators
    Fixed& operator+=(Fixed o) { 
        raw += o.raw; 
        return *this; 
    }
    
    Fixed& operator-=(Fixed o) { 
        raw -= o.raw; 
        return *this; 
    }
    
    Fixed& operator*=(Fixed o) { 
        raw = static_cast<int32_t>((static_cast<int64_t>(raw) * o.raw) >> SHIFT);
        return *this;
    }
    
    Fixed& operator/=(Fixed o) {
        if (o.raw != 0) {
            raw = static_cast<int32_t>((static_cast<int64_t>(raw) << SHIFT) / o.raw);
        }
        return *this;
    }
    
    // Helper: absolute value
    Fixed abs() const {
        return Fixed(raw < 0 ? -raw : raw);
    }
    
    // Helper: min/max
    static Fixed min(Fixed a, Fixed b) {
        return (a.raw < b.raw) ? a : b;
    }
    
    static Fixed max(Fixed a, Fixed b) {
        return (a.raw > b.raw) ? a : b;
    }
};

/**
 * Deterministic integer square root using Newton-Raphson method
 * Essential for vector normalization in fixed-point math
 */
inline Fixed fixed_sqrt(Fixed x) {
    if (x.raw <= 0) {
        return Fixed::from_int(0);
    }
    
    // Initial guess: x / 2
    int32_t guess = x.raw >> 1;
    
    // Newton-Raphson iterations: x_new = (x_old + n/x_old) / 2
    for (int i = 0; i < 8; i++) {
        if (guess == 0) {
            break;
        }
        int32_t next_guess = (guess + x.raw / guess) >> 1;
        if (next_guess == guess) {
            break; // Converged
        }
        guess = next_guess;
    }
    
    return Fixed(guess);
}

/**
 * 3D Vector using fixed-point components
 * Used for position, velocity, acceleration, and forces
 */
struct FixedVector3 {
    Fixed x;
    Fixed y;
    Fixed z;
    
    // Constructors
    FixedVector3() 
        : x(Fixed::from_int(0))
        , y(Fixed::from_int(0))
        , z(Fixed::from_int(0)) 
    {}
    
    FixedVector3(Fixed x_, Fixed y_, Fixed z_) 
        : x(x_)
        , y(y_)
        , z(z_) 
    {}
    
    // Factory methods
    static FixedVector3 from_floats(float fx, float fy, float fz) {
        return FixedVector3(
            Fixed::from_float(fx), 
            Fixed::from_float(fy), 
            Fixed::from_float(fz)
        );
    }
    
    static FixedVector3 zero() {
        return FixedVector3();
    }
    
    // Vector operations
    FixedVector3 operator+(const FixedVector3& o) const {
        return FixedVector3(x + o.x, y + o.y, z + o.z);
    }
    
    FixedVector3 operator-(const FixedVector3& o) const {
        return FixedVector3(x - o.x, y - o.y, z - o.z);
    }
    
    FixedVector3 operator-() const {
        return FixedVector3(-x, -y, -z);
    }
    
    FixedVector3 operator*(Fixed scalar) const {
        return FixedVector3(x * scalar, y * scalar, z * scalar);
    }
    
    FixedVector3 operator/(Fixed scalar) const {
        return FixedVector3(x / scalar, y / scalar, z / scalar);
    }
    
    FixedVector3& operator+=(const FixedVector3& o) {
        x += o.x;
        y += o.y;
        z += o.z;
        return *this;
    }
    
    FixedVector3& operator-=(const FixedVector3& o) {
        x -= o.x;
        y -= o.y;
        z -= o.z;
        return *this;
    }
    
    FixedVector3& operator*=(Fixed scalar) {
        x *= scalar;
        y *= scalar;
        z *= scalar;
        return *this;
    }
    
    // Dot product
    Fixed dot(const FixedVector3& o) const {
        return x * o.x + y * o.y + z * o.z;
    }
    
    // Magnitude squared (avoids sqrt)
    Fixed length_squared() const {
        return x * x + y * y + z * z;
    }
    
    // Magnitude (uses deterministic sqrt)
    Fixed length() const {
        return fixed_sqrt(length_squared());
    }
    
    // Deterministic normalization using fixed-point sqrt
    FixedVector3 normalized() const {
        Fixed len = length();
        
        // Avoid division by very small numbers
        if (len.raw < (Fixed::ONE / 1000)) {
            return FixedVector3::zero();
        }
        
        return FixedVector3(x / len, y / len, z / len);
    }
    
    // Check if vector is approximately zero
    bool is_zero() const {
        return x.raw == 0 && y.raw == 0 && z.raw == 0;
    }
    
    // Component-wise max magnitude (for simple normalization of cardinal directions)
    Fixed max_component_abs() const {
        Fixed ax = x.abs();
        Fixed ay = y.abs();
        Fixed az = z.abs();
        
        Fixed max_val = ax;
        if (ay > max_val) {
            max_val = ay;
        }
        if (az > max_val) {
            max_val = az;
        }
        
        return max_val;
    }
};


