#version 300 es

// <vec2 position, vec2 textureCoord>
layout(location = 0) in vec4 vertexAndTexturePositions;

out vec2 fragmentTextureCoord;
out vec4 particleColour;

uniform mat4 projection;
uniform vec2 offset;
uniform vec4 colour;

float scale = 10.0f;

void main() {
    fragmentTextureCoord = vertexAndTexturePositions.zw;
    particleColour = colour;
    vec2 position = (vertexAndTexturePositions.xy * scale) + offset;
    gl_Position = projection * vec4(position, 0.0f, 1.0f);
}