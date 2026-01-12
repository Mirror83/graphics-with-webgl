// Interfaces generated (but slightly modified) from https://app.quicktype.io/

// To parse this data:
//
//   import { Convert, AssimpScene } from "./file";
//
//   const assimpScene = Convert.toAssimpScene(json);
//
// These functions will throw an error if the JSON doesn't
// match the expected interface, even if the JSON is valid.

/** Data for a 3D model in the {@link https://github.com/acgessler/assimp2json?tab=readme-ov-file#output-format | Assimp JSON format} */
export interface AssimpScene {
  __metadata__: AssimpMetadata;
  rootnode: AssimpNode;
  flags: number;
  meshes: AssimpMesh[];
  materials: AssimpMaterial[];
}

export interface AssimpMetadata {
  format: string;
  version: number;
}

export interface AssimpMaterial {
  properties: AssimpProperty[];
}

export interface AssimpProperty {
  key: string;
  semantic: number;
  index: number;
  type: number;
  value: number[] | number | string;
}

export interface AssimpMesh {
  name: string;
  materialindex: number;
  primitivetypes: number;
  vertices: number[];
  normals: number[];
  tangents: number[];
  bitangents: number[];
  numuvcomponents: number[];
  texturecoords: Array<number[]>;
  faces: Array<number[]>;
}

export interface AssimpNode {
  name: string;
  transformation: number[];
  children: AssimpNode[];
  meshes?: number[];
}

export enum AssimpTextureType {
  NONE = 0,
  DIFFUSE = 1,
  SPECULAR = 2,
  NORMALS = 6,
  LIGHT_MAP = 10
}

export enum AssimpPropertyKey {
  TEXTURE_FILE = "$tex.file"
}

export enum AssimpSceneFlags {
  INCOMPLETE = 0x1
}
