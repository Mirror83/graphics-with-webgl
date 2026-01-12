#version 300 es

layout(location = 0) in vec3 position;
layout(location = 2) in vec2 texCoord;

out vec2 textureFragmentCoord;

uniform mat4 model;
uniform mat4 view;
uniform mat4 projection;

void main() {
    gl_Position = projection * view * model * vec4(position, 1.0f);
    textureFragmentCoord = texCoord;
}