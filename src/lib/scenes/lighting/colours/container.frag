#version 300 es
precision highp float;

out vec4 fragmentColour;
uniform vec3 lightColour;
uniform vec3 containerColour;

void main() {
    fragmentColour = vec4(lightColour, 1.0) * vec4(containerColour, 1.0);
}