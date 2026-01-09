#version 300 es
precision highp float;

in vec2 vertexTexCoord;

out vec4 fragmentColour;

uniform sampler2D texture0;
uniform sampler2D texture1;

void main() {
    fragmentColour = mix(
        texture(texture0, vertexTexCoord),
        texture(texture1, vertexTexCoord), 
        0.5);
}