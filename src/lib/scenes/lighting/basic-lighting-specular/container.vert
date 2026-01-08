#version 300 es

in vec3 position;
in vec3 normal;

out vec3 fragmentNormal;
out vec3 fragmentPosition;

uniform mat4 model;
uniform mat4 view;
uniform mat4 projection;

void main() {
    gl_Position = projection * view * model * vec4(position, 1.0f);
    fragmentPosition = vec3(model * vec4(position, 1.0f));

    // Use the normal matrix to calculate the fragment normal as shown below
    // (the normal matrix is generated in the operations shown in the first operand)
    // if the model matrix applies non-uniform scale to the object.
    // N/B: Calculating the normal matrix per vertex can be very expensive, therefore
    // it is advised to pass it in via a uniform instead.
    // fragmentNormal = mat3(transpose(inverse(model))) * normal
    fragmentNormal = normal;
}