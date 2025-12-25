#version 300 es
precision highp float;

in vec3 vertexColour;
in vec2 vertexTexCoord;

out vec4 fragmentColour;

uniform sampler2D texture0;

void main() {
    fragmentColour = vec4(vertexColour, 1.0) * texture(texture0, vertexTexCoord);
}