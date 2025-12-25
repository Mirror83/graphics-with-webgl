#version 300 es
precision highp float;

in vec4 vertexColour;
out vec4 fragmentColour;

void main() {
    fragmentColour = vertexColour;
}