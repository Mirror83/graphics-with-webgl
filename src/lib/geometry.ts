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
  indices?: Uint32Array;
  attributeConfigs: VertexAttributeConfig[];
};
