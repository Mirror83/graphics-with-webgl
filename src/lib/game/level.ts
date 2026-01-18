import { vec2, vec4 } from "gl-matrix";
import { Block } from "~/lib/game/game-object";
import type { BreakoutGameDimensions } from "~/lib/game/game.svelte";
import type { ResourceManager } from "~/lib/game/resource-manager";
import type { SpriteRenderer } from "~/lib/game/sprite";
import type { Texture2D } from "~/lib/textures";

enum BreakoutGameLevelBlockKind {
  EMPTY,
  SOLID,
  DESTRUCTIBLE_1,
  DESTRUCTIBLE_2,
  DESTRUCTIBLE_3,
  DESTRUCTIBLE_4
}

export class BreakoutGameLevel {
  static async createAndInitLevel(
    resourceManager: ResourceManager,
    levelFilePath: string,
    levelDimensions: BreakoutGameDimensions
  ) {
    const level = new BreakoutGameLevel();
    await level.init(resourceManager, levelFilePath, levelDimensions);
    return level;
  }

  blocks: Block[] = [];

  async init(
    resourceManager: ResourceManager,
    levelFilePath: string,
    levelDimensions: BreakoutGameDimensions
  ) {
    const levelFileContent = await resourceManager.loadLevelText(levelFilePath);
    const blockData = this.#parseLevelFileContent(levelFileContent);
    if (blockData.length === 0 || blockData[0].length === 0) {
      throw new Error("Invalid block data.");
    }
    const columns = blockData[0].length;
    const rows = blockData.length;
    const tileWidth = levelDimensions.x / columns;
    const tileHeight = levelDimensions.y / rows;

    for (let row = 0; row < rows; ++row) {
      for (let column = 0; column < columns; ++column) {
        const blockKind = blockData[row][column];
        switch (blockKind) {
          case BreakoutGameLevelBlockKind.EMPTY:
            break;
          default:
            const position = vec2.fromValues(tileWidth * column, tileHeight * row);
            const size = vec2.fromValues(tileWidth, tileHeight);
            const colour = this.#getColourForBlockKind(blockKind);
            const sprite = this.#getBlockTextureByKind(resourceManager, blockKind);
            const isSolid = this.#isBlockSolid(blockKind);
            const block = new Block({ position, size, sprite: sprite, colour, isSolid });
            this.blocks.push(block);
        }
      }
    }
  }

  reset() {
    for (const block of this.blocks) {
      if (!block.isSolid) {
        block.destroyed = false;
      }
    }
  }

  isCompleted(): boolean {
    return false;
  }

  draw(gl: WebGL2RenderingContext, renderer: SpriteRenderer) {
    for (const block of this.blocks) {
      if (!block.destroyed) {
        block.draw(gl, renderer);
      }
    }
  }

  #isBlockSolid(kind: BreakoutGameLevelBlockKind): boolean {
    return kind === BreakoutGameLevelBlockKind.SOLID;
  }

  #getBlockTextureByKind(
    resourceManager: ResourceManager,
    kind: Exclude<BreakoutGameLevelBlockKind, BreakoutGameLevelBlockKind.EMPTY>
  ): Texture2D {
    let sprite: Texture2D | null;
    switch (kind) {
      case BreakoutGameLevelBlockKind.SOLID:
        sprite = resourceManager.getTexture("block_solid");
        break;
      default:
        sprite = resourceManager.getTexture("block");
    }

    if (!sprite) {
      throw new Error(`Failed to get texture for block kind ${kind}`);
    }

    return sprite;
  }

  #getColourForBlockKind(kind: BreakoutGameLevelBlockKind): vec4 {
    switch (kind) {
      case BreakoutGameLevelBlockKind.SOLID:
        return vec4.fromValues(0.8, 0.8, 0.7, 1);
      case BreakoutGameLevelBlockKind.DESTRUCTIBLE_1:
        return vec4.fromValues(0.8, 0.8, 0.8, 1);
      case BreakoutGameLevelBlockKind.DESTRUCTIBLE_2:
        return vec4.fromValues(0.2, 0.6, 1.0, 1);
      case BreakoutGameLevelBlockKind.DESTRUCTIBLE_3:
        return vec4.fromValues(0.0, 0.7, 0.0, 1);
      case BreakoutGameLevelBlockKind.DESTRUCTIBLE_4:
        return vec4.fromValues(1.0, 0.5, 0.0, 1);
      default:
        return vec4.fromValues(1, 1, 1, 1);
    }
  }

  #parseLevelFileContent(levelFileContent: string) {
    const tileData = levelFileContent.split("\n").map((line) =>
      line.split(" ").map((stringNumber) => {
        try {
          const tileKind = Number(stringNumber);
          if (BreakoutGameLevelBlockKind[tileKind]) {
            return tileKind as BreakoutGameLevelBlockKind;
          }
          throw new Error("Invalid tile kind");
        } catch (err) {
          console.error(err);
          return BreakoutGameLevelBlockKind.EMPTY;
        }
      })
    );
    return tileData;
  }
}
