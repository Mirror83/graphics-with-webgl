#version 300 es
precision highp float;

in vec2 fragmentTextureCoord;
in vec4 particleColour;

out vec4 fragmentColour;

uniform sampler2D sprite;

void main() {
    fragmentColour = texture(sprite, fragmentTextureCoord) * particleColour;
}