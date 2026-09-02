/**
 * Auto-generated 3D Fish & Environment Asset Catalog Metadata
 * Monorepo Source: 3D Characters-Fish (LayerLab)
 * 153 Models across 17 biological and environmental groups.
 */

export interface ModelGeometryBounds {
  width: number
  height: number
  length: number
}

export interface ModelMetadata {
  id: string
  displayName?: string
  display_name?: string
  fbxPath?: string
  fbx_path?: string
  prefabPath?: string
  prefab_path?: string
  vertices: number
  triangles: number
  bones: number
  bounds: ModelGeometryBounds
}

export interface ModelGroupMetadata {
  id: string
  name: string
  family: string
  type: 'creature' | 'prop'
  rig: 'fish' | 'shark' | 'ray' | 'dolphin' | 'seahorse' | 'turtle' | 'lobster' | 'Static'
  controller: string
  boneCount?: number
  bone_count?: number
  behavior: Record<string, unknown>
  models: ModelMetadata[]
}

export const FISH_CATALOG_METADATA: Record<string, ModelGroupMetadata> = {
  "tangs_surgeonfish": {
    "id": "tangs_surgeonfish",
    "name": "Tangs & Surgeonfish",
    "family": "Acanthuridae",
    "type": "creature",
    "rig": "fish",
    "controller": "fish.controller",
    "bone_count": 6,
    "behavior": {
      "depth_range": [
        0.2,
        0.6
      ],
      "base_speed": 1.2,
      "turn_rate": 2.4,
      "scale_default": 1.0,
      "school_size_range": [
        3,
        8
      ],
      "swim_pattern": "active_patrol"
    },
    "models": [
      {
        "id": "AchilesTang",
        "display_name": "Achiles Tang",
        "fbx_path": "Fish/FBX/AchilesTang.fbx",
        "prefab_path": "Fish/Prefabs/AchilesTang.prefab",
        "vertices": 196,
        "triangles": 278,
        "bounds": {
          "width": 11.9,
          "height": 26.5,
          "length": 39.59
        },
        "bones": 6
      },
      {
        "id": "BlackTang",
        "display_name": "Black Tang",
        "fbx_path": "Fish/FBX/BlackTang.fbx",
        "prefab_path": "Fish/Prefabs/BlackTang.prefab",
        "vertices": 102,
        "triangles": 146,
        "bounds": {
          "width": 12.76,
          "height": 30.76,
          "length": 39.1
        },
        "bones": 6
      },
      {
        "id": "BlueTang",
        "display_name": "Blue Tang",
        "fbx_path": "Fish/FBX/BlueTang.fbx",
        "prefab_path": "Fish/Prefabs/BlueTang.prefab",
        "vertices": 190,
        "triangles": 270,
        "bounds": {
          "width": 11.95,
          "height": 19.31,
          "length": 38.21
        },
        "bones": 6
      },
      {
        "id": "HalfBlackMimicTang",
        "display_name": "Half Black Mimic Tang",
        "fbx_path": "Fish/FBX/HalfBlackMimicTang.fbx",
        "prefab_path": "Fish/Prefabs/HalfBlackMimicTang.prefab",
        "vertices": 158,
        "triangles": 225,
        "bounds": {
          "width": 11.34,
          "height": 24.94,
          "length": 36.03
        },
        "bones": 6
      },
      {
        "id": "JamTang",
        "display_name": "Jam Tang",
        "fbx_path": "Fish/FBX/JamTang.fbx",
        "prefab_path": "Fish/Prefabs/JamTang.prefab",
        "vertices": 311,
        "triangles": 382,
        "bounds": {
          "width": 12.76,
          "height": 34.45,
          "length": 38.28
        },
        "bones": 6
      },
      {
        "id": "JewelTang",
        "display_name": "Jewel Tang",
        "fbx_path": "Fish/FBX/JewelTang.fbx",
        "prefab_path": "Fish/Prefabs/JewelTang.prefab",
        "vertices": 250,
        "triangles": 330,
        "bounds": {
          "width": 11.9,
          "height": 22.23,
          "length": 37.85
        },
        "bones": 6
      },
      {
        "id": "PowderBlueTang",
        "display_name": "Powder Blue Tang",
        "fbx_path": "Fish/FBX/PowderBlueTang.fbx",
        "prefab_path": "Fish/Prefabs/PowderBlueTang.prefab",
        "vertices": 132,
        "triangles": 192,
        "bounds": {
          "width": 11.78,
          "height": 25.79,
          "length": 34.8
        },
        "bones": 6
      },
      {
        "id": "SailfinTang",
        "display_name": "Sailfin Tang",
        "fbx_path": "Fish/FBX/SailfinTang.fbx",
        "prefab_path": "Fish/Prefabs/SailfinTang.prefab",
        "vertices": 135,
        "triangles": 192,
        "bounds": {
          "width": 12.76,
          "height": 33.81,
          "length": 37.35
        },
        "bones": 6
      },
      {
        "id": "UnicornTang",
        "display_name": "Unicorn Tang",
        "fbx_path": "Fish/FBX/UnicornTang.fbx",
        "prefab_path": "Fish/Prefabs/UnicornTang.prefab",
        "vertices": 111,
        "triangles": 160,
        "bounds": {
          "width": 12.3,
          "height": 26.01,
          "length": 43.23
        },
        "bones": 6
      },
      {
        "id": "WhiteTailTang",
        "display_name": "White Tail Tang",
        "fbx_path": "Fish/FBX/WhiteTailTang.fbx",
        "prefab_path": "Fish/Prefabs/WhiteTailTang.prefab",
        "vertices": 253,
        "triangles": 362,
        "bounds": {
          "width": 11.9,
          "height": 25.53,
          "length": 37.14
        },
        "bones": 6
      },
      {
        "id": "WhiteTang",
        "display_name": "White Tang",
        "fbx_path": "Fish/FBX/WhiteTang.fbx",
        "prefab_path": "Fish/Prefabs/WhiteTang.prefab",
        "vertices": 102,
        "triangles": 146,
        "bounds": {
          "width": 12.76,
          "height": 28.83,
          "length": 38.17
        },
        "bones": 6
      },
      {
        "id": "YellowTang",
        "display_name": "Yellow Tang",
        "fbx_path": "Fish/FBX/YellowTang.fbx",
        "prefab_path": "Fish/Prefabs/YellowTang.prefab",
        "vertices": 110,
        "triangles": 156,
        "bounds": {
          "width": 12.76,
          "height": 25.46,
          "length": 38.87
        },
        "bones": 6
      }
    ]
  },
  "angelfish": {
    "id": "angelfish",
    "name": "Marine Angelfish",
    "family": "Pomacanthidae",
    "type": "creature",
    "rig": "fish",
    "controller": "fish.controller",
    "bone_count": 6,
    "behavior": {
      "depth_range": [
        0.3,
        0.7
      ],
      "base_speed": 0.9,
      "turn_rate": 2.0,
      "scale_default": 1.1,
      "school_size_range": [
        1,
        4
      ],
      "swim_pattern": "graceful_hover"
    },
    "models": [
      {
        "id": "BallinaAngelfish",
        "display_name": "Ballina Angelfish",
        "fbx_path": "Fish/FBX/BallinaAngelfish.fbx",
        "prefab_path": "Fish/Prefabs/BallinaAngelfish.prefab",
        "vertices": 134,
        "triangles": 193,
        "bounds": {
          "width": 11.75,
          "height": 23.04,
          "length": 37.13
        },
        "bones": 6
      },
      {
        "id": "BanditAngelfish",
        "display_name": "Bandit Angelfish",
        "fbx_path": "Fish/FBX/BanditAngelfish.fbx",
        "prefab_path": "Fish/Prefabs/BanditAngelfish.prefab",
        "vertices": 146,
        "triangles": 210,
        "bounds": {
          "width": 12.76,
          "height": 25.39,
          "length": 38.1
        },
        "bones": 6
      },
      {
        "id": "BicolorAngelfish",
        "display_name": "Bicolor Angelfish",
        "fbx_path": "Fish/FBX/BicolorAngelfish.fbx",
        "prefab_path": "Fish/Prefabs/BicolorAngelfish.prefab",
        "vertices": 102,
        "triangles": 144,
        "bounds": {
          "width": 12.17,
          "height": 23.07,
          "length": 36.56
        },
        "bones": 6
      },
      {
        "id": "ConspicAngelfish",
        "display_name": "Conspic Angelfish",
        "fbx_path": "Fish/FBX/ConspicAngelfish.fbx",
        "prefab_path": "Fish/Prefabs/ConspicAngelfish.prefab",
        "vertices": 128,
        "triangles": 182,
        "bounds": {
          "width": 12.76,
          "height": 24.77,
          "length": 37.29
        },
        "bones": 6
      },
      {
        "id": "FlameAngelfish",
        "display_name": "Flame Angelfish",
        "fbx_path": "Fish/FBX/FlameAngelfish.fbx",
        "prefab_path": "Fish/Prefabs/FlameAngelfish.prefab",
        "vertices": 227,
        "triangles": 331,
        "bounds": {
          "width": 11.9,
          "height": 24.44,
          "length": 37.43
        },
        "bones": 6
      },
      {
        "id": "FrenchAngelfish",
        "display_name": "French Angelfish",
        "fbx_path": "Fish/FBX/FrenchAngelfish.fbx",
        "prefab_path": "Fish/Prefabs/FrenchAngelfish.prefab",
        "vertices": 163,
        "triangles": 232,
        "bounds": {
          "width": 11.94,
          "height": 27.69,
          "length": 32.82
        },
        "bones": 6
      },
      {
        "id": "KoranAngelfish",
        "display_name": "Koran Angelfish",
        "fbx_path": "Fish/FBX/KoranAngelfish.fbx",
        "prefab_path": "Fish/Prefabs/KoranAngelfish.prefab",
        "vertices": 194,
        "triangles": 270,
        "bounds": {
          "width": 12.76,
          "height": 25.76,
          "length": 38.34
        },
        "bones": 6
      },
      {
        "id": "LemonPeelAngelfish",
        "display_name": "Lemon Peel Angelfish",
        "fbx_path": "Fish/FBX/LemonPeelAngelfish.fbx",
        "prefab_path": "Fish/Prefabs/LemonPeelAngelfish.prefab",
        "vertices": 127,
        "triangles": 180,
        "bounds": {
          "width": 12.24,
          "height": 25.11,
          "length": 37.43
        },
        "bones": 6
      },
      {
        "id": "MaskedAngelfish",
        "display_name": "Masked Angelfish",
        "fbx_path": "Fish/FBX/MaskedAngelfish.fbx",
        "prefab_path": "Fish/Prefabs/MaskedAngelfish.prefab",
        "vertices": 99,
        "triangles": 143,
        "bounds": {
          "width": 12.76,
          "height": 25.78,
          "length": 37.81
        },
        "bones": 6
      },
      {
        "id": "MazeAngelfish",
        "display_name": "Maze Angelfish",
        "fbx_path": "Fish/FBX/MazeAngelfish.fbx",
        "prefab_path": "Fish/Prefabs/MazeAngelfish.prefab",
        "vertices": 141,
        "triangles": 201,
        "bounds": {
          "width": 12.76,
          "height": 28.54,
          "length": 35.14
        },
        "bones": 6
      },
      {
        "id": "PandaAngelfish",
        "display_name": "Panda Angelfish",
        "fbx_path": "Fish/FBX/PandaAngelfish.fbx",
        "prefab_path": "Fish/Prefabs/PandaAngelfish.prefab",
        "vertices": 103,
        "triangles": 155,
        "bounds": {
          "width": 12.17,
          "height": 21.81,
          "length": 37.24
        },
        "bones": 6
      },
      {
        "id": "PeppermintAngelfish",
        "display_name": "Peppermint Angelfish",
        "fbx_path": "Fish/FBX/PeppermintAngelfish.fbx",
        "prefab_path": "Fish/Prefabs/PeppermintAngelfish.prefab",
        "vertices": 176,
        "triangles": 244,
        "bounds": {
          "width": 12.24,
          "height": 24.62,
          "length": 36.98
        },
        "bones": 6
      },
      {
        "id": "QueenAngelfish",
        "display_name": "Queen Angelfish",
        "fbx_path": "Fish/FBX/QueenAngelfish.fbx",
        "prefab_path": "Fish/Prefabs/QueenAngelfish.prefab",
        "vertices": 139,
        "triangles": 204,
        "bounds": {
          "width": 11.86,
          "height": 23.2,
          "length": 40.35
        },
        "bones": 6
      },
      {
        "id": "WatanabeAngelfish",
        "display_name": "Watanabe Angelfish",
        "fbx_path": "Fish/FBX/WatanabeAngelfish.fbx",
        "prefab_path": "Fish/Prefabs/WatanabeAngelfish.prefab",
        "vertices": 116,
        "triangles": 166,
        "bounds": {
          "width": 12.76,
          "height": 23.59,
          "length": 37.33
        },
        "bones": 6
      }
    ]
  },
  "butterflyfish": {
    "id": "butterflyfish",
    "name": "Butterflyfish",
    "family": "Chaetodontidae",
    "type": "creature",
    "rig": "fish",
    "controller": "fish.controller",
    "bone_count": 6,
    "behavior": {
      "depth_range": [
        0.2,
        0.5
      ],
      "base_speed": 1.0,
      "turn_rate": 2.5,
      "scale_default": 0.95,
      "school_size_range": [
        2,
        6
      ],
      "swim_pattern": "dart_and_peck"
    },
    "models": [
      {
        "id": "CopperbandButterflyfish",
        "display_name": "Copperband Butterflyfish",
        "fbx_path": "Fish/FBX/CopperbandButterflyfish.fbx",
        "prefab_path": "Fish/Prefabs/CopperbandButterflyfish.prefab",
        "vertices": 200,
        "triangles": 286,
        "bounds": {
          "width": 10.37,
          "height": 25.67,
          "length": 33.1
        },
        "bones": 6
      },
      {
        "id": "EightbandedButterflyfish",
        "display_name": "Eightbanded Butterflyfish",
        "fbx_path": "Fish/FBX/EightbandedButterflyfish.fbx",
        "prefab_path": "Fish/Prefabs/EightbandedButterflyfish.prefab",
        "vertices": 172,
        "triangles": 246,
        "bounds": {
          "width": 12.76,
          "height": 26.16,
          "length": 33.07
        },
        "bones": 6
      },
      {
        "id": "FoureyeButterflyfish",
        "display_name": "Foureye Butterflyfish",
        "fbx_path": "Fish/FBX/FoureyeButterflyfish.fbx",
        "prefab_path": "Fish/Prefabs/FoureyeButterflyfish.prefab",
        "vertices": 186,
        "triangles": 276,
        "bounds": {
          "width": 12.27,
          "height": 26.15,
          "length": 35.42
        },
        "bones": 6
      },
      {
        "id": "GoldenButterfly",
        "display_name": "Golden Butterfly",
        "fbx_path": "Fish/FBX/GoldenButterfly.fbx",
        "prefab_path": "Fish/Prefabs/GoldenButterfly.prefab",
        "vertices": 174,
        "triangles": 246,
        "bounds": {
          "width": 12.76,
          "height": 25.35,
          "length": 37.59
        },
        "bones": 6
      },
      {
        "id": "LongnoseButterflyfish",
        "display_name": "Longnose Butterflyfish",
        "fbx_path": "Fish/FBX/LongnoseButterflyfish.fbx",
        "prefab_path": "Fish/Prefabs/LongnoseButterflyfish.prefab",
        "vertices": 160,
        "triangles": 242,
        "bounds": {
          "width": 12.06,
          "height": 30.13,
          "length": 35.29
        },
        "bones": 6
      },
      {
        "id": "RacoonButterflyfish",
        "display_name": "Racoon Butterflyfish",
        "fbx_path": "Fish/FBX/RacoonButterflyfish.fbx",
        "prefab_path": "Fish/Prefabs/RacoonButterflyfish.prefab",
        "vertices": 168,
        "triangles": 240,
        "bounds": {
          "width": 12.33,
          "height": 24.43,
          "length": 36.28
        },
        "bones": 6
      },
      {
        "id": "SaddleButterflyfish",
        "display_name": "Saddle Butterflyfish",
        "fbx_path": "Fish/FBX/SaddleButterflyfish.fbx",
        "prefab_path": "Fish/Prefabs/SaddleButterflyfish.prefab",
        "vertices": 158,
        "triangles": 234,
        "bounds": {
          "width": 11.44,
          "height": 24.69,
          "length": 35.05
        },
        "bones": 6
      },
      {
        "id": "SpeckeldButterfly",
        "display_name": "Speckeld Butterfly",
        "fbx_path": "Fish/FBX/SpeckeldButterfly.fbx",
        "prefab_path": "Fish/Prefabs/SpeckeldButterfly.prefab",
        "vertices": 253,
        "triangles": 326,
        "bounds": {
          "width": 12.62,
          "height": 24.28,
          "length": 38.98
        },
        "bones": 6
      },
      {
        "id": "ZosterButterflyfish",
        "display_name": "Zoster Butterflyfish",
        "fbx_path": "Fish/FBX/ZosterButterflyfish.fbx",
        "prefab_path": "Fish/Prefabs/ZosterButterflyfish.prefab",
        "vertices": 118,
        "triangles": 173,
        "bounds": {
          "width": 12.76,
          "height": 24.59,
          "length": 38.34
        },
        "bones": 6
      }
    ]
  },
  "clownfish": {
    "id": "clownfish",
    "name": "Anemone Clownfish",
    "family": "Pomacentridae (Amphiprioninae)",
    "type": "creature",
    "rig": "fish",
    "controller": "fish.controller",
    "bone_count": 6,
    "behavior": {
      "depth_range": [
        0.4,
        0.8
      ],
      "base_speed": 0.8,
      "turn_rate": 3.0,
      "scale_default": 0.8,
      "school_size_range": [
        2,
        5
      ],
      "swim_pattern": "anemone_wiggle"
    },
    "models": [
      {
        "id": "Clownfish",
        "display_name": "Clownfish",
        "fbx_path": "Fish/FBX/Clownfish.fbx",
        "prefab_path": "Fish/Prefabs/Clownfish.prefab",
        "vertices": 179,
        "triangles": 249,
        "bounds": {
          "width": 11.34,
          "height": 17.8,
          "length": 28.65
        },
        "bones": 6
      },
      {
        "id": "DarwinClownfish",
        "display_name": "Darwin Clownfish",
        "fbx_path": "Fish/FBX/DarwinClownfish.fbx",
        "prefab_path": "Fish/Prefabs/DarwinClownfish.prefab",
        "vertices": 191,
        "triangles": 266,
        "bounds": {
          "width": 11.34,
          "height": 17.8,
          "length": 28.65
        },
        "bones": 6
      },
      {
        "id": "JuggaloClownfish",
        "display_name": "Juggalo Clownfish",
        "fbx_path": "Fish/FBX/JuggaloClownfish.fbx",
        "prefab_path": "Fish/Prefabs/JuggaloClownfish.prefab",
        "vertices": 231,
        "triangles": 340,
        "bounds": {
          "width": 11.34,
          "height": 17.8,
          "length": 28.65
        },
        "bones": 6
      },
      {
        "id": "PinkSkunkClownfish",
        "display_name": "Pink Skunk Clownfish",
        "fbx_path": "Fish/FBX/PinkSkunkClownfish.fbx",
        "prefab_path": "Fish/Prefabs/PinkSkunkClownfish.prefab",
        "vertices": 206,
        "triangles": 289,
        "bounds": {
          "width": 11.34,
          "height": 16.91,
          "length": 29.03
        },
        "bones": 6
      },
      {
        "id": "TomatoClownfish",
        "display_name": "Tomato Clownfish",
        "fbx_path": "Fish/FBX/TomatoClownfish.fbx",
        "prefab_path": "Fish/Prefabs/TomatoClownfish.prefab",
        "vertices": 199,
        "triangles": 277,
        "bounds": {
          "width": 11.34,
          "height": 16.2,
          "length": 29.36
        },
        "bones": 6
      },
      {
        "id": "WyomingWhiteClownfish",
        "display_name": "Wyoming White Clownfish",
        "fbx_path": "Fish/FBX/WyomingWhiteClownfish.fbx",
        "prefab_path": "Fish/Prefabs/WyomingWhiteClownfish.prefab",
        "vertices": 232,
        "triangles": 332,
        "bounds": {
          "width": 11.34,
          "height": 17.35,
          "length": 28.65
        },
        "bones": 6
      }
    ]
  },
  "damselfish_chromis": {
    "id": "damselfish_chromis",
    "name": "Damselfish & Chromis",
    "family": "Pomacentridae",
    "type": "creature",
    "rig": "fish",
    "controller": "fish.controller",
    "bone_count": 6,
    "behavior": {
      "depth_range": [
        0.1,
        0.6
      ],
      "base_speed": 1.3,
      "turn_rate": 3.2,
      "scale_default": 0.75,
      "school_size_range": [
        5,
        12
      ],
      "swim_pattern": "high_agility_shoal"
    },
    "models": [
      {
        "id": "AzureDamsel",
        "display_name": "Azure Damsel",
        "fbx_path": "Fish/FBX/AzureDamsel.fbx",
        "prefab_path": "Fish/Prefabs/AzureDamsel.prefab",
        "vertices": 107,
        "triangles": 162,
        "bounds": {
          "width": 10.71,
          "height": 17.51,
          "length": 32.67
        },
        "bones": 6
      },
      {
        "id": "BarrierReefChromis",
        "display_name": "Barrier Reef Chromis",
        "fbx_path": "Fish/FBX/BarrierReefChromis.fbx",
        "prefab_path": "Fish/Prefabs/BarrierReefChromis.prefab",
        "vertices": 114,
        "triangles": 168,
        "bounds": {
          "width": 10.37,
          "height": 17.29,
          "length": 36.03
        },
        "bones": 6
      },
      {
        "id": "BlackandWhiteChromis",
        "display_name": "Blackand White Chromis",
        "fbx_path": "Fish/FBX/BlackandWhiteChromis.fbx",
        "prefab_path": "Fish/Prefabs/BlackandWhiteChromis.prefab",
        "vertices": 104,
        "triangles": 158,
        "bounds": {
          "width": 11.46,
          "height": 20.58,
          "length": 37.33
        },
        "bones": 6
      },
      {
        "id": "BleekersDamsel",
        "display_name": "Bleekers Damsel",
        "fbx_path": "Fish/FBX/BleekersDamsel.fbx",
        "prefab_path": "Fish/Prefabs/BleekersDamsel.prefab",
        "vertices": 103,
        "triangles": 151,
        "bounds": {
          "width": 11.33,
          "height": 19.96,
          "length": 37.58
        },
        "bones": 6
      },
      {
        "id": "CorazonDamsel",
        "display_name": "Corazon Damsel",
        "fbx_path": "Fish/FBX/CorazonDamsel.fbx",
        "prefab_path": "Fish/Prefabs/CorazonDamsel.prefab",
        "vertices": 117,
        "triangles": 178,
        "bounds": {
          "width": 11.72,
          "height": 19.2,
          "length": 36.03
        },
        "bones": 6
      },
      {
        "id": "DominoDamsel",
        "display_name": "Domino Damsel",
        "fbx_path": "Fish/FBX/DominoDamsel.fbx",
        "prefab_path": "Fish/Prefabs/DominoDamsel.prefab",
        "vertices": 151,
        "triangles": 219,
        "bounds": {
          "width": 12.76,
          "height": 30.89,
          "length": 36.35
        },
        "bones": 6
      },
      {
        "id": "GreenChromis",
        "display_name": "Green Chromis",
        "fbx_path": "Fish/FBX/GreenChromis.fbx",
        "prefab_path": "Fish/Prefabs/GreenChromis.prefab",
        "vertices": 101,
        "triangles": 148,
        "bounds": {
          "width": 10.37,
          "height": 18.45,
          "length": 34.79
        },
        "bones": 6
      },
      {
        "id": "JewelDamsel",
        "display_name": "Jewel Damsel",
        "fbx_path": "Fish/FBX/JewelDamsel.fbx",
        "prefab_path": "Fish/Prefabs/JewelDamsel.prefab",
        "vertices": 166,
        "triangles": 204,
        "bounds": {
          "width": 11.4,
          "height": 20.7,
          "length": 33.71
        },
        "bones": 6
      },
      {
        "id": "JuvenileYellowDamselfish",
        "display_name": "Juvenile Yellow Damselfish",
        "fbx_path": "Fish/FBX/JuvenileYellowDamselfish.fbx",
        "prefab_path": "Fish/Prefabs/JuvenileYellowDamselfish.prefab",
        "vertices": 134,
        "triangles": 200,
        "bounds": {
          "width": 11.24,
          "height": 20.58,
          "length": 35.98
        },
        "bones": 6
      },
      {
        "id": "PinkSmithDamsel",
        "display_name": "Pink Smith Damsel",
        "fbx_path": "Fish/FBX/PinkSmithDamsel.fbx",
        "prefab_path": "Fish/Prefabs/PinkSmithDamsel.prefab",
        "vertices": 96,
        "triangles": 141,
        "bounds": {
          "width": 11.73,
          "height": 20.0,
          "length": 36.07
        },
        "bones": 6
      },
      {
        "id": "ThreeStripeDamsel",
        "display_name": "Three Stripe Damsel",
        "fbx_path": "Fish/FBX/ThreeStripeDamsel.fbx",
        "prefab_path": "Fish/Prefabs/ThreeStripeDamsel.prefab",
        "vertices": 128,
        "triangles": 194,
        "bounds": {
          "width": 10.44,
          "height": 20.02,
          "length": 31.89
        },
        "bones": 6
      }
    ]
  },
  "gobies_basslets": {
    "id": "gobies_basslets",
    "name": "Gobies, Basslets & Small Reef Dwellers",
    "family": "Gobiidae / Grammatidae / Apogonidae",
    "type": "creature",
    "rig": "fish",
    "controller": "fish.controller",
    "bone_count": 6,
    "behavior": {
      "depth_range": [
        0.6,
        0.95
      ],
      "base_speed": 0.7,
      "turn_rate": 3.5,
      "scale_default": 0.7,
      "school_size_range": [
        1,
        3
      ],
      "swim_pattern": "benthic_perch_and_dart"
    },
    "models": [
      {
        "id": "BlackcapBasslet",
        "display_name": "Blackcap Basslet",
        "fbx_path": "Fish/FBX/BlackcapBasslet.fbx",
        "prefab_path": "Fish/Prefabs/BlackcapBasslet.prefab",
        "vertices": 105,
        "triangles": 155,
        "bounds": {
          "width": 12.76,
          "height": 13.84,
          "length": 40.48
        },
        "bones": 6
      },
      {
        "id": "BluebandedGoby",
        "display_name": "Bluebanded Goby",
        "fbx_path": "Fish/FBX/BluebandedGoby.fbx",
        "prefab_path": "Fish/Prefabs/BluebandedGoby.prefab",
        "vertices": 158,
        "triangles": 235,
        "bounds": {
          "width": 11.17,
          "height": 16.96,
          "length": 37.08
        },
        "bones": 6
      },
      {
        "id": "CandyBasslet",
        "display_name": "Candy Basslet",
        "fbx_path": "Fish/FBX/CandyBasslet.fbx",
        "prefab_path": "Fish/Prefabs/CandyBasslet.prefab",
        "vertices": 220,
        "triangles": 314,
        "bounds": {
          "width": 12.76,
          "height": 16.75,
          "length": 36.49
        },
        "bones": 6
      },
      {
        "id": "CaptiveBredYellowlineGoby",
        "display_name": "Captive Bred Yellowline Goby",
        "fbx_path": "Fish/FBX/CaptiveBredYellowlineGoby.fbx",
        "prefab_path": "Fish/Prefabs/CaptiveBredYellowlineGoby.prefab",
        "vertices": 130,
        "triangles": 167,
        "bounds": {
          "width": 11.17,
          "height": 11.77,
          "length": 35.84
        },
        "bones": 6
      },
      {
        "id": "FireGoby",
        "display_name": "Fire Goby",
        "fbx_path": "Fish/FBX/FireGoby.fbx",
        "prefab_path": "Fish/Prefabs/FireGoby.prefab",
        "vertices": 119,
        "triangles": 180,
        "bounds": {
          "width": 11.17,
          "height": 20.72,
          "length": 34.72
        },
        "bones": 6
      },
      {
        "id": "GoldenDottyback",
        "display_name": "Golden Dottyback",
        "fbx_path": "Fish/FBX/GoldenDottyback.fbx",
        "prefab_path": "Fish/Prefabs/GoldenDottyback.prefab",
        "vertices": 96,
        "triangles": 136,
        "bounds": {
          "width": 12.76,
          "height": 14.75,
          "length": 32.8
        },
        "bones": 6
      },
      {
        "id": "GoldneonPygmyGoby",
        "display_name": "Goldneon Pygmy Goby",
        "fbx_path": "Fish/FBX/GoldneonPygmyGoby.fbx",
        "prefab_path": "Fish/Prefabs/GoldneonPygmyGoby.prefab",
        "vertices": 129,
        "triangles": 170,
        "bounds": {
          "width": 11.17,
          "height": 10.64,
          "length": 35.84
        },
        "bones": 6
      },
      {
        "id": "GreenbandedGoby",
        "display_name": "Greenbanded Goby",
        "fbx_path": "Fish/FBX/GreenbandedGoby.fbx",
        "prefab_path": "Fish/Prefabs/GreenbandedGoby.prefab",
        "vertices": 187,
        "triangles": 291,
        "bounds": {
          "width": 11.17,
          "height": 15.17,
          "length": 37.32
        },
        "bones": 6
      },
      {
        "id": "JennniferDottyback",
        "display_name": "Jennnifer Dottyback",
        "fbx_path": "Fish/FBX/JennniferDottyback.fbx",
        "prefab_path": "Fish/Prefabs/JennniferDottyback.prefab",
        "vertices": 98,
        "triangles": 143,
        "bounds": {
          "width": 12.76,
          "height": 17.1,
          "length": 34.79
        },
        "bones": 6
      },
      {
        "id": "KaudernsCardinalfish",
        "display_name": "Kauderns Cardinalfish",
        "fbx_path": "Fish/FBX/KaudernsCardinalfish.fbx",
        "prefab_path": "Fish/Prefabs/KaudernsCardinalfish.prefab",
        "vertices": 155,
        "triangles": 236,
        "bounds": {
          "width": 10.37,
          "height": 29.32,
          "length": 39.21
        },
        "bones": 6
      },
      {
        "id": "LinedCardinal",
        "display_name": "Lined Cardinal",
        "fbx_path": "Fish/FBX/LinedCardinal.fbx",
        "prefab_path": "Fish/Prefabs/LinedCardinal.prefab",
        "vertices": 222,
        "triangles": 317,
        "bounds": {
          "width": 10.37,
          "height": 20.53,
          "length": 35.62
        },
        "bones": 6
      },
      {
        "id": "PazamaCardinal",
        "display_name": "Pazama Cardinal",
        "fbx_path": "Fish/FBX/PazamaCardinal.fbx",
        "prefab_path": "Fish/Prefabs/PazamaCardinal.prefab",
        "vertices": 247,
        "triangles": 343,
        "bounds": {
          "width": 10.37,
          "height": 29.89,
          "length": 35.85
        },
        "bones": 6
      },
      {
        "id": "PrettyRoseGoby",
        "display_name": "Pretty Rose Goby",
        "fbx_path": "Fish/FBX/PrettyRoseGoby.fbx",
        "prefab_path": "Fish/Prefabs/PrettyRoseGoby.prefab",
        "vertices": 149,
        "triangles": 219,
        "bounds": {
          "width": 11.17,
          "height": 20.74,
          "length": 35.79
        },
        "bones": 6
      },
      {
        "id": "ScissortailDartfish",
        "display_name": "Scissortail Dartfish",
        "fbx_path": "Fish/FBX/ScissortailDartfish.fbx",
        "prefab_path": "Fish/Prefabs/ScissortailDartfish.prefab",
        "vertices": 99,
        "triangles": 144,
        "bounds": {
          "width": 11.17,
          "height": 14.87,
          "length": 33.02
        },
        "bones": 6
      },
      {
        "id": "SkunkTilefish",
        "display_name": "Skunk Tilefish",
        "fbx_path": "Fish/FBX/SkunkTilefish.fbx",
        "prefab_path": "Fish/Prefabs/SkunkTilefish.prefab",
        "vertices": 118,
        "triangles": 176,
        "bounds": {
          "width": 11.17,
          "height": 12.29,
          "length": 34.88
        },
        "bones": 6
      },
      {
        "id": "StrawberryDottyback",
        "display_name": "Strawberry Dottyback",
        "fbx_path": "Fish/FBX/StrawberryDottyback.fbx",
        "prefab_path": "Fish/Prefabs/StrawberryDottyback.prefab",
        "vertices": 121,
        "triangles": 175,
        "bounds": {
          "width": 12.76,
          "height": 17.1,
          "length": 34.79
        },
        "bones": 6
      },
      {
        "id": "WheelersShrimpGoby",
        "display_name": "Wheelers Shrimp Goby",
        "fbx_path": "Fish/FBX/WheelersShrimpGoby.fbx",
        "prefab_path": "Fish/Prefabs/WheelersShrimpGoby.prefab",
        "vertices": 131,
        "triangles": 194,
        "bounds": {
          "width": 11.17,
          "height": 12.83,
          "length": 35.65
        },
        "bones": 6
      }
    ]
  },
  "pelagic_groupers": {
    "id": "pelagic_groupers",
    "name": "Pelagic Fish & Groupers",
    "family": "Scombridae / Serranidae / Zanclidae",
    "type": "creature",
    "rig": "fish",
    "controller": "fish.controller",
    "bone_count": 6,
    "behavior": {
      "depth_range": [
        0.1,
        0.6
      ],
      "base_speed": 1.6,
      "turn_rate": 1.8,
      "scale_default": 1.3,
      "school_size_range": [
        2,
        6
      ],
      "swim_pattern": "fast_cruising"
    },
    "models": [
      {
        "id": "BluefinTuna",
        "display_name": "Bluefin Tuna",
        "fbx_path": "Fish/FBX/BluefinTuna.fbx",
        "prefab_path": "Fish/Prefabs/BluefinTuna.prefab",
        "vertices": 142,
        "triangles": 211,
        "bounds": {
          "width": 27.89,
          "height": 46.71,
          "length": 83.55
        },
        "bones": 6
      },
      {
        "id": "BumblebeeGrouper",
        "display_name": "Bumblebee Grouper",
        "fbx_path": "Fish/FBX/BumblebeeGrouper.fbx",
        "prefab_path": "Fish/Prefabs/BumblebeeGrouper.prefab",
        "vertices": 193,
        "triangles": 279,
        "bounds": {
          "width": 14.66,
          "height": 25.52,
          "length": 39.94
        },
        "bones": 6
      },
      {
        "id": "MoorishIdol",
        "display_name": "Moorish Idol",
        "fbx_path": "Fish/FBX/MoorishIdol.fbx",
        "prefab_path": "Fish/Prefabs/MoorishIdol.prefab",
        "vertices": 155,
        "triangles": 226,
        "bounds": {
          "width": 10.37,
          "height": 25.98,
          "length": 38.66
        },
        "bones": 6
      },
      {
        "id": "PantherGrouper",
        "display_name": "Panther Grouper",
        "fbx_path": "Fish/FBX/PantherGrouper.fbx",
        "prefab_path": "Fish/Prefabs/PantherGrouper.prefab",
        "vertices": 208,
        "triangles": 306,
        "bounds": {
          "width": 14.47,
          "height": 25.95,
          "length": 51.46
        },
        "bones": 6
      },
      {
        "id": "SkipjackTuna",
        "display_name": "Skipjack Tuna",
        "fbx_path": "Fish/FBX/SkipjackTuna.fbx",
        "prefab_path": "Fish/Prefabs/SkipjackTuna.prefab",
        "vertices": 223,
        "triangles": 333,
        "bounds": {
          "width": 26.42,
          "height": 40.81,
          "length": 83.22
        },
        "bones": 6
      },
      {
        "id": "YellowfinTuna",
        "display_name": "Yellowfin Tuna",
        "fbx_path": "Fish/FBX/YellowfinTuna.fbx",
        "prefab_path": "Fish/Prefabs/YellowfinTuna.prefab",
        "vertices": 184,
        "triangles": 278,
        "bounds": {
          "width": 26.42,
          "height": 45.7,
          "length": 84.54
        },
        "bones": 6
      }
    ]
  },
  "sharks": {
    "id": "sharks",
    "name": "Apex & Benthic Sharks",
    "family": "Selachimorpha",
    "type": "creature",
    "rig": "shark",
    "controller": "shark.controller",
    "bone_count": 9,
    "behavior": {
      "depth_range": [
        0.3,
        0.8
      ],
      "base_speed": 1.4,
      "turn_rate": 1.4,
      "scale_default": 1.5,
      "school_size_range": [
        1,
        2
      ],
      "swim_pattern": "continuous_glide_patrol"
    },
    "models": [
      {
        "id": "AngelShark",
        "display_name": "Angel Shark",
        "fbx_path": "Fish/FBX/AngelShark.fbx",
        "prefab_path": "Fish/Prefabs/AngelShark.prefab",
        "vertices": 328,
        "triangles": 469,
        "bounds": {
          "width": 219.29,
          "height": 81.26,
          "length": 307.44
        },
        "bones": 7
      },
      {
        "id": "BlacktipReefShark",
        "display_name": "Blacktip Reef Shark",
        "fbx_path": "Fish/FBX/BlacktipReefShark.fbx",
        "prefab_path": "Fish/Prefabs/BlacktipReefShark.prefab",
        "vertices": 298,
        "triangles": 431,
        "bounds": {
          "width": 120.63,
          "height": 88.01,
          "length": 314.08
        },
        "bones": 7
      },
      {
        "id": "CommonThresherShark",
        "display_name": "Common Thresher Shark",
        "fbx_path": "Fish/FBX/CommonThresherShark.fbx",
        "prefab_path": "Fish/Prefabs/CommonThresherShark.prefab",
        "vertices": 285,
        "triangles": 408,
        "bounds": {
          "width": 129.55,
          "height": 97.44,
          "length": 360.59
        },
        "bones": 9
      },
      {
        "id": "GreateWhiteShark",
        "display_name": "Greate White Shark",
        "fbx_path": "Fish/FBX/GreateWhiteShark.fbx",
        "prefab_path": "Fish/Prefabs/GreateWhiteShark.prefab",
        "vertices": 276,
        "triangles": 395,
        "bounds": {
          "width": 160.57,
          "height": 112.52,
          "length": 342.32
        },
        "bones": 7
      },
      {
        "id": "NurseShark",
        "display_name": "Nurse Shark",
        "fbx_path": "Fish/FBX/NurseShark.fbx",
        "prefab_path": "Fish/Prefabs/NurseShark.prefab",
        "vertices": 335,
        "triangles": 482,
        "bounds": {
          "width": 133.99,
          "height": 123.02,
          "length": 315.95
        },
        "bones": 7
      }
    ]
  },
  "rays": {
    "id": "rays",
    "name": "Manta & Eagle Rays",
    "family": "Myliobatiformes",
    "type": "creature",
    "rig": "ray",
    "controller": "ray.controller",
    "bone_count": 19,
    "behavior": {
      "depth_range": [
        0.2,
        0.7
      ],
      "base_speed": 1.1,
      "turn_rate": 1.2,
      "scale_default": 1.6,
      "school_size_range": [
        1,
        3
      ],
      "swim_pattern": "sinusoidal_wing_soar"
    },
    "models": [
      {
        "id": "MantaRay",
        "display_name": "Manta Ray",
        "fbx_path": "Fish/FBX/MantaRay.fbx",
        "prefab_path": "Fish/Prefabs/MantaRay.prefab",
        "vertices": 281,
        "triangles": 403,
        "bounds": {
          "width": 178.95,
          "height": 20.57,
          "length": 207.83
        },
        "bones": 19
      },
      {
        "id": "SpottedEagleRay",
        "display_name": "Spotted Eagle Ray",
        "fbx_path": "Fish/FBX/SpottedEagleRay.fbx",
        "prefab_path": "Fish/Prefabs/SpottedEagleRay.prefab",
        "vertices": 384,
        "triangles": 517,
        "bounds": {
          "width": 147.14,
          "height": 17.85,
          "length": 194.35
        },
        "bones": 19
      }
    ]
  },
  "seahorses": {
    "id": "seahorses",
    "name": "Seahorses & Pipefish",
    "family": "Syngnathidae",
    "type": "creature",
    "rig": "seahorse",
    "controller": "seahorse.controller",
    "bone_count": 17,
    "behavior": {
      "depth_range": [
        0.5,
        0.9
      ],
      "base_speed": 0.4,
      "turn_rate": 1.8,
      "scale_default": 0.85,
      "school_size_range": [
        1,
        2
      ],
      "swim_pattern": "vertical_buoyancy_drift"
    },
    "models": [
      {
        "id": "BlackSeahorse",
        "display_name": "Black Seahorse",
        "fbx_path": "Fish/FBX/BlackSeahorse.fbx",
        "prefab_path": "Fish/Prefabs/BlackSeahorse.prefab",
        "vertices": 344,
        "triangles": 474,
        "bounds": {
          "width": 5.98,
          "height": 36.5,
          "length": 19.2
        },
        "bones": 17
      },
      {
        "id": "GreenSeahorse",
        "display_name": "Green Seahorse",
        "fbx_path": "Fish/FBX/GreenSeahorse.fbx",
        "prefab_path": "Fish/Prefabs/GreenSeahorse.prefab",
        "vertices": 328,
        "triangles": 452,
        "bounds": {
          "width": 5.98,
          "height": 36.49,
          "length": 19.2
        },
        "bones": 17
      },
      {
        "id": "PygmeSeahorse",
        "display_name": "Pygme Seahorse",
        "fbx_path": "Fish/FBX/PygmeSeahorse.fbx",
        "prefab_path": "Fish/Prefabs/PygmeSeahorse.prefab",
        "vertices": 258,
        "triangles": 368,
        "bounds": {
          "width": 6.93,
          "height": 36.92,
          "length": 17.89
        },
        "bones": 17
      },
      {
        "id": "RedSeahorse",
        "display_name": "Red Seahorse",
        "fbx_path": "Fish/FBX/RedSeahorse.fbx",
        "prefab_path": "Fish/Prefabs/RedSeahorse.prefab",
        "vertices": 336,
        "triangles": 466,
        "bounds": {
          "width": 6.68,
          "height": 36.48,
          "length": 19.69
        },
        "bones": 17
      },
      {
        "id": "ZebraSeahorse",
        "display_name": "Zebra Seahorse",
        "fbx_path": "Fish/FBX/ZebraSeahorse.fbx",
        "prefab_path": "Fish/Prefabs/ZebraSeahorse.prefab",
        "vertices": 470,
        "triangles": 650,
        "bounds": {
          "width": 5.98,
          "height": 36.9,
          "length": 19.48
        },
        "bones": 17
      }
    ]
  },
  "sea_turtles": {
    "id": "sea_turtles",
    "name": "Sea Turtles",
    "family": "Cheloniidae / Dermochelyidae",
    "type": "creature",
    "rig": "turtle",
    "controller": "turtle.controller",
    "bone_count": 14,
    "behavior": {
      "depth_range": [
        0.1,
        0.6
      ],
      "base_speed": 0.75,
      "turn_rate": 1.1,
      "scale_default": 1.4,
      "school_size_range": [
        1,
        2
      ],
      "swim_pattern": "rhythmic_flipper_stroke"
    },
    "models": [
      {
        "id": "GreenTurtle",
        "display_name": "Green Turtle",
        "fbx_path": "Fish/FBX/GreenTurtle.fbx",
        "prefab_path": "Fish/Prefabs/GreenTurtle.prefab",
        "vertices": 437,
        "triangles": 592,
        "bounds": {
          "width": 128.36,
          "height": 36.3,
          "length": 112.79
        },
        "bones": 14
      },
      {
        "id": "HawksbillTurtle",
        "display_name": "Hawksbill Turtle",
        "fbx_path": "Fish/FBX/HawksbillTurtle.fbx",
        "prefab_path": "Fish/Prefabs/HawksbillTurtle.prefab",
        "vertices": 505,
        "triangles": 699,
        "bounds": {
          "width": 127.4,
          "height": 35.0,
          "length": 112.11
        },
        "bones": 14
      },
      {
        "id": "LeatherbackTurtle",
        "display_name": "Leatherback Turtle",
        "fbx_path": "Fish/FBX/LeatherbackTurtle.fbx",
        "prefab_path": "Fish/Prefabs/LeatherbackTurtle.prefab",
        "vertices": 462,
        "triangles": 637,
        "bounds": {
          "width": 154.93,
          "height": 41.91,
          "length": 131.48
        },
        "bones": 14
      },
      {
        "id": "LoggerheadTurtle",
        "display_name": "Loggerhead Turtle",
        "fbx_path": "Fish/FBX/LoggerheadTurtle.fbx",
        "prefab_path": "Fish/Prefabs/LoggerheadTurtle.prefab",
        "vertices": 484,
        "triangles": 669,
        "bounds": {
          "width": 155.86,
          "height": 41.74,
          "length": 128.27
        },
        "bones": 14
      }
    ]
  },
  "dolphins": {
    "id": "dolphins",
    "name": "Oceanic & River Dolphins",
    "family": "Delphinidae",
    "type": "creature",
    "rig": "dolphin",
    "controller": "dolphin.controller",
    "bone_count": 7,
    "behavior": {
      "depth_range": [
        0.05,
        0.4
      ],
      "base_speed": 1.8,
      "turn_rate": 2.2,
      "scale_default": 1.5,
      "school_size_range": [
        2,
        5
      ],
      "swim_pattern": "undulating_surface_breach"
    },
    "models": [
      {
        "id": "HectorDolphin",
        "display_name": "Hector Dolphin",
        "fbx_path": "Fish/FBX/HectorDolphin.fbx",
        "prefab_path": "Fish/Prefabs/HectorDolphin.prefab",
        "vertices": 273,
        "triangles": 379,
        "bounds": {
          "width": 77.96,
          "height": 64.77,
          "length": 186.92
        },
        "bones": 7
      },
      {
        "id": "IndusRiverDolphin",
        "display_name": "Indus River Dolphin",
        "fbx_path": "Fish/FBX/IndusRiverDolphin.fbx",
        "prefab_path": "Fish/Prefabs/IndusRiverDolphin.prefab",
        "vertices": 279,
        "triangles": 388,
        "bounds": {
          "width": 82.57,
          "height": 50.5,
          "length": 214.24
        },
        "bones": 7
      },
      {
        "id": "PinkDolphin",
        "display_name": "Pink Dolphin",
        "fbx_path": "Fish/FBX/PinkDolphin.fbx",
        "prefab_path": "Fish/Prefabs/PinkDolphin.prefab",
        "vertices": 263,
        "triangles": 364,
        "bounds": {
          "width": 78.4,
          "height": 56.43,
          "length": 188.93
        },
        "bones": 7
      },
      {
        "id": "RightWhaleDolphin",
        "display_name": "Right Whale Dolphin",
        "fbx_path": "Fish/FBX/RightWhaleDolphin.fbx",
        "prefab_path": "Fish/Prefabs/RightWhaleDolphin.prefab",
        "vertices": 254,
        "triangles": 353,
        "bounds": {
          "width": 82.19,
          "height": 47.26,
          "length": 186.69
        },
        "bones": 7
      },
      {
        "id": "TucuxiDophin",
        "display_name": "Tucuxi Dophin",
        "fbx_path": "Fish/FBX/TucuxiDophin.fbx",
        "prefab_path": "Fish/Prefabs/TucuxiDophin.prefab",
        "vertices": 260,
        "triangles": 361,
        "bounds": {
          "width": 82.2,
          "height": 57.06,
          "length": 191.84
        },
        "bones": 7
      }
    ]
  },
  "crustaceans_lobsters": {
    "id": "crustaceans_lobsters",
    "name": "Lobsters & Crustaceans",
    "family": "Nephropidae",
    "type": "creature",
    "rig": "lobster",
    "controller": "lobster.controller",
    "bone_count": 13,
    "behavior": {
      "depth_range": [
        0.85,
        1.0
      ],
      "base_speed": 0.5,
      "turn_rate": 2.0,
      "scale_default": 1.0,
      "school_size_range": [
        1,
        2
      ],
      "swim_pattern": "seafloor_crawl_and_tailflip"
    },
    "models": [
      {
        "id": "BlueLobster",
        "display_name": "Blue Lobster",
        "fbx_path": "Fish/FBX/BlueLobster.fbx",
        "prefab_path": "Fish/Prefabs/BlueLobster.prefab",
        "vertices": 427,
        "triangles": 596,
        "bounds": {
          "width": 38.52,
          "height": 16.97,
          "length": 63.07
        },
        "bones": 13
      },
      {
        "id": "Lobster",
        "display_name": "Lobster",
        "fbx_path": "Fish/FBX/Lobster.fbx",
        "prefab_path": "Fish/Prefabs/Lobster.prefab",
        "vertices": 431,
        "triangles": 604,
        "bounds": {
          "width": 38.52,
          "height": 16.97,
          "length": 63.07
        },
        "bones": 13
      }
    ]
  },
  "corals_sea_flora": {
    "id": "corals_sea_flora",
    "name": "Corals & Sea Anemones",
    "family": "Anthozoa",
    "type": "prop",
    "rig": "Static",
    "controller": "None",
    "bone_count": 0,
    "behavior": {
      "placement": "seabed_clusters",
      "depth_range": [
        0.85,
        1.0
      ],
      "scale_variance": [
        0.7,
        1.4
      ]
    },
    "models": [
      {
        "id": "CoralAA",
        "display_name": "Coral A A",
        "fbx_path": "Fish/FBX/CoralAA.fbx",
        "prefab_path": "Fish/Prefabs/CoralAA.prefab",
        "vertices": 245,
        "triangles": 310,
        "bounds": {
          "width": 18.53,
          "height": 27.0,
          "length": 13.85
        },
        "bones": 0
      },
      {
        "id": "CoralAB",
        "display_name": "Coral A B",
        "fbx_path": "Fish/FBX/CoralAB.fbx",
        "prefab_path": "Fish/Prefabs/CoralAB.prefab",
        "vertices": 245,
        "triangles": 310,
        "bounds": {
          "width": 18.53,
          "height": 27.0,
          "length": 13.85
        },
        "bones": 0
      },
      {
        "id": "CoralBA",
        "display_name": "Coral B A",
        "fbx_path": "Fish/FBX/CoralBA.fbx",
        "prefab_path": "Fish/Prefabs/CoralBA.prefab",
        "vertices": 580,
        "triangles": 734,
        "bounds": {
          "width": 37.71,
          "height": 33.96,
          "length": 29.32
        },
        "bones": 0
      },
      {
        "id": "CoralBB",
        "display_name": "Coral B B",
        "fbx_path": "Fish/FBX/CoralBB.fbx",
        "prefab_path": "Fish/Prefabs/CoralBB.prefab",
        "vertices": 580,
        "triangles": 734,
        "bounds": {
          "width": 37.71,
          "height": 33.96,
          "length": 29.32
        },
        "bones": 0
      },
      {
        "id": "CoralCA",
        "display_name": "Coral C A",
        "fbx_path": "Fish/FBX/CoralCA.fbx",
        "prefab_path": "Fish/Prefabs/CoralCA.prefab",
        "vertices": 678,
        "triangles": 858,
        "bounds": {
          "width": 54.3,
          "height": 63.72,
          "length": 53.05
        },
        "bones": 0
      },
      {
        "id": "CoralCB",
        "display_name": "Coral C B",
        "fbx_path": "Fish/FBX/CoralCB.fbx",
        "prefab_path": "Fish/Prefabs/CoralCB.prefab",
        "vertices": 678,
        "triangles": 858,
        "bounds": {
          "width": 54.3,
          "height": 63.72,
          "length": 53.05
        },
        "bones": 0
      },
      {
        "id": "CoralD",
        "display_name": "Coral D",
        "fbx_path": "Fish/FBX/CoralD.fbx",
        "prefab_path": "Fish/Prefabs/CoralD.prefab",
        "vertices": 245,
        "triangles": 310,
        "bounds": {
          "width": 28.11,
          "height": 25.12,
          "length": 25.64
        },
        "bones": 0
      },
      {
        "id": "CoralE",
        "display_name": "Coral E",
        "fbx_path": "Fish/FBX/CoralE.fbx",
        "prefab_path": "Fish/Prefabs/CoralE.prefab",
        "vertices": 488,
        "triangles": 618,
        "bounds": {
          "width": 39.28,
          "height": 37.12,
          "length": 30.14
        },
        "bones": 0
      },
      {
        "id": "CoralF",
        "display_name": "Coral F",
        "fbx_path": "Fish/FBX/CoralF.fbx",
        "prefab_path": "Fish/Prefabs/CoralF.prefab",
        "vertices": 294,
        "triangles": 372,
        "bounds": {
          "width": 26.56,
          "height": 42.4,
          "length": 30.82
        },
        "bones": 0
      },
      {
        "id": "CoralG",
        "display_name": "Coral G",
        "fbx_path": "Fish/FBX/CoralG.fbx",
        "prefab_path": "Fish/Prefabs/CoralG.prefab",
        "vertices": 97,
        "triangles": 132,
        "bounds": {
          "width": 32.41,
          "height": 32.31,
          "length": 28.72
        },
        "bones": 0
      },
      {
        "id": "CoralH",
        "display_name": "Coral H",
        "fbx_path": "Fish/FBX/CoralH.fbx",
        "prefab_path": "Fish/Prefabs/CoralH.prefab",
        "vertices": 97,
        "triangles": 132,
        "bounds": {
          "width": 32.41,
          "height": 32.31,
          "length": 28.72
        },
        "bones": 0
      },
      {
        "id": "CoralIA",
        "display_name": "Coral I A",
        "fbx_path": "Fish/FBX/CoralIA.fbx",
        "prefab_path": "Fish/Prefabs/CoralIA.prefab",
        "vertices": 184,
        "triangles": 205,
        "bounds": {
          "width": 94.34,
          "height": 43.71,
          "length": 77.68
        },
        "bones": 0
      },
      {
        "id": "CoralIB",
        "display_name": "Coral I B",
        "fbx_path": "Fish/FBX/CoralIB.fbx",
        "prefab_path": "Fish/Prefabs/CoralIB.prefab",
        "vertices": 184,
        "triangles": 205,
        "bounds": {
          "width": 94.34,
          "height": 43.71,
          "length": 77.68
        },
        "bones": 0
      },
      {
        "id": "CoralJA",
        "display_name": "Coral J A",
        "fbx_path": "Fish/FBX/CoralJA.fbx",
        "prefab_path": "Fish/Prefabs/CoralJA.prefab",
        "vertices": 184,
        "triangles": 205,
        "bounds": {
          "width": 102.81,
          "height": 42.63,
          "length": 79.58
        },
        "bones": 0
      },
      {
        "id": "CoralJB",
        "display_name": "Coral J B",
        "fbx_path": "Fish/FBX/CoralJB.fbx",
        "prefab_path": "Fish/Prefabs/CoralJB.prefab",
        "vertices": 184,
        "triangles": 205,
        "bounds": {
          "width": 102.81,
          "height": 42.63,
          "length": 79.58
        },
        "bones": 0
      },
      {
        "id": "CoralKA",
        "display_name": "Coral K A",
        "fbx_path": "Fish/FBX/CoralKA.fbx",
        "prefab_path": "Fish/Prefabs/CoralKA.prefab",
        "vertices": 981,
        "triangles": 1270,
        "bounds": {
          "width": 79.98,
          "height": 71.09,
          "length": 83.5
        },
        "bones": 0
      },
      {
        "id": "CoralKB",
        "display_name": "Coral K B",
        "fbx_path": "Fish/FBX/CoralKB.fbx",
        "prefab_path": "Fish/Prefabs/CoralKB.prefab",
        "vertices": 981,
        "triangles": 1270,
        "bounds": {
          "width": 79.98,
          "height": 71.09,
          "length": 83.5
        },
        "bones": 0
      },
      {
        "id": "CoralKC",
        "display_name": "Coral K C",
        "fbx_path": "Fish/FBX/CoralKC.fbx",
        "prefab_path": "Fish/Prefabs/CoralKC.prefab",
        "vertices": 981,
        "triangles": 1270,
        "bounds": {
          "width": 79.98,
          "height": 71.09,
          "length": 83.5
        },
        "bones": 0
      },
      {
        "id": "CoralKD",
        "display_name": "Coral K D",
        "fbx_path": "Fish/FBX/CoralKD.fbx",
        "prefab_path": "Fish/Prefabs/CoralKD.prefab",
        "vertices": 981,
        "triangles": 1270,
        "bounds": {
          "width": 79.98,
          "height": 71.09,
          "length": 83.5
        },
        "bones": 0
      },
      {
        "id": "CoralLA",
        "display_name": "Coral L A",
        "fbx_path": "Fish/FBX/CoralLA.fbx",
        "prefab_path": "Fish/Prefabs/CoralLA.prefab",
        "vertices": 278,
        "triangles": 367,
        "bounds": {
          "width": 108.05,
          "height": 75.92,
          "length": 85.75
        },
        "bones": 0
      },
      {
        "id": "CoralLB",
        "display_name": "Coral L B",
        "fbx_path": "Fish/FBX/CoralLB.fbx",
        "prefab_path": "Fish/Prefabs/CoralLB.prefab",
        "vertices": 278,
        "triangles": 367,
        "bounds": {
          "width": 108.05,
          "height": 75.92,
          "length": 85.75
        },
        "bones": 0
      },
      {
        "id": "CoralMA",
        "display_name": "Coral M A",
        "fbx_path": "Fish/FBX/CoralMA.fbx",
        "prefab_path": "Fish/Prefabs/CoralMA.prefab",
        "vertices": 209,
        "triangles": 300,
        "bounds": {
          "width": 26.87,
          "height": 48.71,
          "length": 21.89
        },
        "bones": 0
      },
      {
        "id": "CoralMB",
        "display_name": "Coral M B",
        "fbx_path": "Fish/FBX/CoralMB.fbx",
        "prefab_path": "Fish/Prefabs/CoralMB.prefab",
        "vertices": 209,
        "triangles": 300,
        "bounds": {
          "width": 33.22,
          "height": 55.28,
          "length": 28.45
        },
        "bones": 0
      },
      {
        "id": "CoralNA",
        "display_name": "Coral N A",
        "fbx_path": "Fish/FBX/CoralNA.fbx",
        "prefab_path": "Fish/Prefabs/CoralNA.prefab",
        "vertices": 495,
        "triangles": 676,
        "bounds": {
          "width": 61.11,
          "height": 80.05,
          "length": 51.27
        },
        "bones": 0
      },
      {
        "id": "CoralNB",
        "display_name": "Coral N B",
        "fbx_path": "Fish/FBX/CoralNB.fbx",
        "prefab_path": "Fish/Prefabs/CoralNB.prefab",
        "vertices": 495,
        "triangles": 676,
        "bounds": {
          "width": 61.11,
          "height": 80.05,
          "length": 51.27
        },
        "bones": 0
      },
      {
        "id": "CoralNC",
        "display_name": "Coral N C",
        "fbx_path": "Fish/FBX/CoralNC.fbx",
        "prefab_path": "Fish/Prefabs/CoralNC.prefab",
        "vertices": 495,
        "triangles": 676,
        "bounds": {
          "width": 61.11,
          "height": 80.05,
          "length": 51.27
        },
        "bones": 0
      },
      {
        "id": "CoralND",
        "display_name": "Coral N D",
        "fbx_path": "Fish/FBX/CoralND.fbx",
        "prefab_path": "Fish/Prefabs/CoralND.prefab",
        "vertices": 495,
        "triangles": 676,
        "bounds": {
          "width": 61.11,
          "height": 80.05,
          "length": 51.27
        },
        "bones": 0
      },
      {
        "id": "CoralOA",
        "display_name": "Coral O A",
        "fbx_path": "Fish/FBX/CoralOA.fbx",
        "prefab_path": "Fish/Prefabs/CoralOA.prefab",
        "vertices": 38,
        "triangles": 42,
        "bounds": {
          "width": 50.16,
          "height": 23.29,
          "length": 49.1
        },
        "bones": 0
      },
      {
        "id": "CoralOB",
        "display_name": "Coral O B",
        "fbx_path": "Fish/FBX/CoralOB.fbx",
        "prefab_path": "Fish/Prefabs/CoralOB.prefab",
        "vertices": 41,
        "triangles": 38,
        "bounds": {
          "width": 52.05,
          "height": 19.97,
          "length": 42.01
        },
        "bones": 0
      },
      {
        "id": "CoralOC",
        "display_name": "Coral O C",
        "fbx_path": "Fish/FBX/CoralOC.fbx",
        "prefab_path": "Fish/Prefabs/CoralOC.prefab",
        "vertices": 41,
        "triangles": 42,
        "bounds": {
          "width": 54.7,
          "height": 19.45,
          "length": 44.52
        },
        "bones": 0
      },
      {
        "id": "CoralOD",
        "display_name": "Coral O D",
        "fbx_path": "Fish/FBX/CoralOD.fbx",
        "prefab_path": "Fish/Prefabs/CoralOD.prefab",
        "vertices": 114,
        "triangles": 109,
        "bounds": {
          "width": 62.16,
          "height": 21.34,
          "length": 58.88
        },
        "bones": 0
      }
    ]
  },
  "seaweed_kelp": {
    "id": "seaweed_kelp",
    "name": "Seaweed & Kelp Beds",
    "family": "Phaeophyceae",
    "type": "prop",
    "rig": "Static",
    "controller": "None",
    "bone_count": 0,
    "behavior": {
      "placement": "dense_forest_groves",
      "depth_range": [
        0.7,
        1.0
      ],
      "scale_variance": [
        0.8,
        1.6
      ],
      "shader_sway": true
    },
    "models": [
      {
        "id": "SeaweedA",
        "display_name": "Seaweed A",
        "fbx_path": "Fish/FBX/SeaweedA.fbx",
        "prefab_path": "Fish/Prefabs/SeaweedA.prefab",
        "vertices": 32,
        "triangles": 28,
        "bounds": {
          "width": 28.15,
          "height": 112.0,
          "length": 18.03
        },
        "bones": 0
      },
      {
        "id": "SeaweedB",
        "display_name": "Seaweed B",
        "fbx_path": "Fish/FBX/SeaweedB.fbx",
        "prefab_path": "Fish/Prefabs/SeaweedB.prefab",
        "vertices": 32,
        "triangles": 28,
        "bounds": {
          "width": 24.62,
          "height": 113.29,
          "length": 17.59
        },
        "bones": 0
      },
      {
        "id": "SeaweedC",
        "display_name": "Seaweed C",
        "fbx_path": "Fish/FBX/SeaweedC.fbx",
        "prefab_path": "Fish/Prefabs/SeaweedC.prefab",
        "vertices": 96,
        "triangles": 84,
        "bounds": {
          "width": 29.98,
          "height": 137.85,
          "length": 20.24
        },
        "bones": 0
      },
      {
        "id": "SeaweedD",
        "display_name": "Seaweed D",
        "fbx_path": "Fish/FBX/SeaweedD.fbx",
        "prefab_path": "Fish/Prefabs/SeaweedD.prefab",
        "vertices": 128,
        "triangles": 112,
        "bounds": {
          "width": 44.81,
          "height": 137.85,
          "length": 20.27
        },
        "bones": 0
      }
    ]
  },
  "rocks_and_terrain": {
    "id": "rocks_and_terrain",
    "name": "Rocks, Reef Boulders & Terrain",
    "family": "Geological Formations",
    "type": "prop",
    "rig": "Static",
    "controller": "None",
    "bone_count": 0,
    "behavior": {
      "placement": "foundation_and_perimeter",
      "depth_range": [
        0.8,
        1.0
      ],
      "scale_variance": [
        0.5,
        2.5
      ]
    },
    "models": [
      {
        "id": "Ground",
        "display_name": "Ground",
        "fbx_path": "Fish/FBX/Ground.fbx",
        "prefab_path": "Fish/Prefabs/Ground.prefab",
        "vertices": 204,
        "triangles": 134,
        "bounds": {
          "width": 3810.98,
          "height": 1524.24,
          "length": 3810.98
        },
        "bones": 0
      },
      {
        "id": "Land",
        "display_name": "Land",
        "fbx_path": "Fish/FBX/Land.fbx",
        "prefab_path": "Fish/Prefabs/Land.prefab",
        "vertices": 1624,
        "triangles": 2654,
        "bounds": {
          "width": 1869.42,
          "height": 185.89,
          "length": 1871.16
        },
        "bones": 0
      },
      {
        "id": "RockA",
        "display_name": "Rock A",
        "fbx_path": "Fish/FBX/RockA.fbx",
        "prefab_path": "Fish/Prefabs/RockA.prefab",
        "vertices": 39,
        "triangles": 45,
        "bounds": {
          "width": 118.3,
          "height": 41.54,
          "length": 92.51
        },
        "bones": 0
      },
      {
        "id": "RockB",
        "display_name": "Rock B",
        "fbx_path": "Fish/FBX/RockB.fbx",
        "prefab_path": "Fish/Prefabs/RockB.prefab",
        "vertices": 68,
        "triangles": 82,
        "bounds": {
          "width": 107.92,
          "height": 32.92,
          "length": 91.73
        },
        "bones": 0
      },
      {
        "id": "RockC",
        "display_name": "Rock C",
        "fbx_path": "Fish/FBX/RockC.fbx",
        "prefab_path": "Fish/Prefabs/RockC.prefab",
        "vertices": 118,
        "triangles": 141,
        "bounds": {
          "width": 170.95,
          "height": 87.02,
          "length": 141.25
        },
        "bones": 0
      },
      {
        "id": "RockD",
        "display_name": "Rock D",
        "fbx_path": "Fish/FBX/RockD.fbx",
        "prefab_path": "Fish/Prefabs/RockD.prefab",
        "vertices": 226,
        "triangles": 295,
        "bounds": {
          "width": 228.96,
          "height": 147.13,
          "length": 144.67
        },
        "bones": 0
      },
      {
        "id": "RockE",
        "display_name": "Rock E",
        "fbx_path": "Fish/FBX/RockE.fbx",
        "prefab_path": "Fish/Prefabs/RockE.prefab",
        "vertices": 159,
        "triangles": 198,
        "bounds": {
          "width": 190.81,
          "height": 98.94,
          "length": 124.5
        },
        "bones": 0
      },
      {
        "id": "RockF",
        "display_name": "Rock F",
        "fbx_path": "Fish/FBX/RockF.fbx",
        "prefab_path": "Fish/Prefabs/RockF.prefab",
        "vertices": 267,
        "triangles": 326,
        "bounds": {
          "width": 213.65,
          "height": 73.32,
          "length": 181.27
        },
        "bones": 0
      },
      {
        "id": "RockG",
        "display_name": "Rock G",
        "fbx_path": "Fish/FBX/RockG.fbx",
        "prefab_path": "Fish/Prefabs/RockG.prefab",
        "vertices": 131,
        "triangles": 168,
        "bounds": {
          "width": 348.98,
          "height": 261.25,
          "length": 250.78
        },
        "bones": 0
      },
      {
        "id": "RockH",
        "display_name": "Rock H",
        "fbx_path": "Fish/FBX/RockH.fbx",
        "prefab_path": "Fish/Prefabs/RockH.prefab",
        "vertices": 264,
        "triangles": 345,
        "bounds": {
          "width": 354.84,
          "height": 551.54,
          "length": 388.72
        },
        "bones": 0
      },
      {
        "id": "RockI",
        "display_name": "Rock I",
        "fbx_path": "Fish/FBX/RockI.fbx",
        "prefab_path": "Fish/Prefabs/RockI.prefab",
        "vertices": 307,
        "triangles": 402,
        "bounds": {
          "width": 378.72,
          "height": 657.48,
          "length": 388.72
        },
        "bones": 0
      },
      {
        "id": "RockJ",
        "display_name": "Rock J",
        "fbx_path": "Fish/FBX/RockJ.fbx",
        "prefab_path": "Fish/Prefabs/RockJ.prefab",
        "vertices": 346,
        "triangles": 456,
        "bounds": {
          "width": 288.66,
          "height": 638.48,
          "length": 371.51
        },
        "bones": 0
      },
      {
        "id": "RockK",
        "display_name": "Rock K",
        "fbx_path": "Fish/FBX/RockK.fbx",
        "prefab_path": "Fish/Prefabs/RockK.prefab",
        "vertices": 411,
        "triangles": 535,
        "bounds": {
          "width": 557.86,
          "height": 631.8,
          "length": 391.4
        },
        "bones": 0
      },
      {
        "id": "Sea",
        "display_name": "Sea",
        "fbx_path": "Fish/FBX/Sea.fbx",
        "prefab_path": "Fish/Prefabs/Sea.prefab",
        "vertices": 1583,
        "triangles": 2294,
        "bounds": {
          "width": 1867.93,
          "height": 881.8,
          "length": 1869.66
        },
        "bones": 0
      }
    ]
  },
  "shells_and_starfish": {
    "id": "shells_and_starfish",
    "name": "Shells, Conch & Starfish",
    "family": "Mollusca / Asteroidea",
    "type": "prop",
    "rig": "Static",
    "controller": "None",
    "bone_count": 0,
    "behavior": {
      "placement": "scattered_on_sand",
      "depth_range": [
        0.95,
        1.0
      ],
      "scale_variance": [
        0.6,
        1.2
      ]
    },
    "models": [
      {
        "id": "ShellA",
        "display_name": "Shell A",
        "fbx_path": "Fish/FBX/ShellA.fbx",
        "prefab_path": "Fish/Prefabs/ShellA.prefab",
        "vertices": 60,
        "triangles": 82,
        "bounds": {
          "width": 18.27,
          "height": 3.46,
          "length": 17.15
        },
        "bones": 0
      },
      {
        "id": "ShellB",
        "display_name": "Shell B",
        "fbx_path": "Fish/FBX/ShellB.fbx",
        "prefab_path": "Fish/Prefabs/ShellB.prefab",
        "vertices": 140,
        "triangles": 193,
        "bounds": {
          "width": 18.27,
          "height": 16.53,
          "length": 17.15
        },
        "bones": 0
      },
      {
        "id": "ShellC",
        "display_name": "Shell C",
        "fbx_path": "Fish/FBX/ShellC.fbx",
        "prefab_path": "Fish/Prefabs/ShellC.prefab",
        "vertices": 98,
        "triangles": 133,
        "bounds": {
          "width": 27.31,
          "height": 28.4,
          "length": 27.02
        },
        "bones": 0
      },
      {
        "id": "ShellD",
        "display_name": "Shell D",
        "fbx_path": "Fish/FBX/ShellD.fbx",
        "prefab_path": "Fish/Prefabs/ShellD.prefab",
        "vertices": 98,
        "triangles": 133,
        "bounds": {
          "width": 27.31,
          "height": 28.4,
          "length": 27.02
        },
        "bones": 0
      },
      {
        "id": "StarfishA",
        "display_name": "Starfish A",
        "fbx_path": "Fish/FBX/StarfishA.fbx",
        "prefab_path": "Fish/Prefabs/StarfishA.prefab",
        "vertices": 142,
        "triangles": 186,
        "bounds": {
          "width": 29.89,
          "height": 3.34,
          "length": 29.62
        },
        "bones": 0
      },
      {
        "id": "StarfishB",
        "display_name": "Starfish B",
        "fbx_path": "Fish/FBX/StarfishB.fbx",
        "prefab_path": "Fish/Prefabs/StarfishB.prefab",
        "vertices": 142,
        "triangles": 186,
        "bounds": {
          "width": 29.89,
          "height": 3.34,
          "length": 29.62
        },
        "bones": 0
      }
    ]
  }
};
