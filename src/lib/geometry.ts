export type VertexAttributeConfig = {
  name: string;
  numberOfComponents: number;
  type: WebGL2RenderingContext["FLOAT"];
  normalize: boolean;
  stride: number;
  offset: number;
};

export type Geometry = {
  vertices: Float32Array;
  attributeConfigs: VertexAttributeConfig[];
  indices?: Uint32Array;
  textures?: WebGLTexture[];
};
