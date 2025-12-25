#version 300 es
precision highp float;

in vec2 vertexTexCoord;

out vec4 fragmentColour;

uniform sampler2D texture0;
uniform sampler2D texture1;
uniform float mixAmount;

void main() {
    fragmentColour = mix(
        texture(texture0, vertexTexCoord),
        texture(texture1, vertexTexCoord), 
        clamp(mixAmount, 0.0f, 1.0f));
}