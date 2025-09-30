# CMakeLists.txt for Refactored Game Architecture
cmake_minimum_required(VERSION 3.16)
project(DozedEntRefactored)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Source files for the refactored architecture
set(MANAGER_SOURCES
    managers/InputManager.cpp
    managers/PlayerManager.cpp
    managers/CombatManager.cpp
    managers/GameStateManager.cpp
)

set(COORDINATOR_SOURCES
    coordinators/GameCoordinator.cpp
)

set(CORE_SOURCES
    core/GameGlobals.cpp
)

set(PHYSICS_SOURCES
    physics/PhysicsManager.cpp
)

set(MAIN_SOURCES
    game_refactored.cpp
)

# All sources
set(ALL_SOURCES
    ${MANAGER_SOURCES}
    ${COORDINATOR_SOURCES}
    ${CORE_SOURCES}
    ${PHYSICS_SOURCES}
    ${MAIN_SOURCES}
)

# Include directories
include_directories(
    ${CMAKE_CURRENT_SOURCE_DIR}
    ${CMAKE_CURRENT_SOURCE_DIR}/managers
    ${CMAKE_CURRENT_SOURCE_DIR}/coordinators
    ${CMAKE_CURRENT_SOURCE_DIR}/core
    ${CMAKE_CURRENT_SOURCE_DIR}/physics
)

# Create executable for testing (when not building for WASM)
if(NOT EMSCRIPTEN)
    add_executable(game_refactored_test ${ALL_SOURCES})
    
    # Add compiler flags for debugging
    target_compile_options(game_refactored_test PRIVATE
        -Wall
        -Wextra
        -Wpedantic
        -g
        -O0
    )
endif()

# WASM build configuration
if(EMSCRIPTEN)
    add_executable(game_refactored ${ALL_SOURCES})
    
    # WASM-specific compiler flags
    target_compile_options(game_refactored PRIVATE
        -O3
        -DNDEBUG
    )
    
    # WASM-specific linker flags
    target_link_options(game_refactored PRIVATE
        -O3
        -s STANDALONE_WASM=1
        -s WASM_BIGINT=1
        -s EXPORT_ALL=0
        -s ALLOW_MEMORY_GROWTH=1
        --no-entry
    )
    
    # Set output name
    set_target_properties(game_refactored PROPERTIES OUTPUT_NAME "game_refactored")
endif()

# Optional: Create a library for easier testing
add_library(game_refactored_lib STATIC ${ALL_SOURCES})

target_include_directories(game_refactored_lib PUBLIC
    ${CMAKE_CURRENT_SOURCE_DIR}
    ${CMAKE_CURRENT_SOURCE_DIR}/managers
    ${CMAKE_CURRENT_SOURCE_DIR}/coordinators
    ${CMAKE_CURRENT_SOURCE_DIR}/core
    ${CMAKE_CURRENT_SOURCE_DIR}/physics
)

# Compiler flags for the library
target_compile_options(game_refactored_lib PRIVATE
    -Wall
    -Wextra
    -Wpedantic
)

# Optional: Enable testing
option(BUILD_TESTS "Build unit tests" OFF)

if(BUILD_TESTS)
    enable_testing()
    
    # Add test subdirectory if it exists
    if(EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/tests)
        add_subdirectory(tests)
    endif()
endif()

# Print configuration information
message(STATUS "Building refactored game architecture")
message(STATUS "C++ Standard: ${CMAKE_CXX_STANDARD}")
message(STATUS "Build Type: ${CMAKE_BUILD_TYPE}")
if(EMSCRIPTEN)
    message(STATUS "Target: WebAssembly (Emscripten)")
else()
    message(STATUS "Target: Native")
endif()

