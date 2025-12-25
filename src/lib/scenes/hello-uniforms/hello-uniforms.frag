#version 300 es
precision highp float;

uniform vec4 u_colour;
out vec4 fragment_colour;

void main() {
    fragment_colour = u_colour;
}