#version 300 es
precision highp float;

in vec3 fragmentNormal;
in vec3 fragmentPosition;

out vec4 fragmentColour;

uniform vec3 lightPosition;
uniform vec3 cameraPosition;
uniform vec3 lightColour;
uniform vec3 containerColour;

void main() {
    float ambientStrength = 0.1;
    float specularStrength = 0.5;
    vec3 ambientColour = ambientStrength * lightColour;

    // Both lightPosition and fragmentPosition are assumed to be defined in world space
    vec3 normalizedNormal = normalize(fragmentNormal);
    vec3 lightDirection = normalize(lightPosition - fragmentPosition);

    // The cosine of the angle between the normal and the light direction.
    // This tells us the diffuse impact of the light on the current fragment
    // i.e the closer the value is to 90 deg the angle is, the stronger the influence
    // of the light on the colour of the object and vice versa
    float diff = max(dot(normalizedNormal, lightDirection), 0.0);
    vec3 diffuseColour = diff * lightColour;

    // The direction of the lightDirection vector reflected around the normal of the fragment
    // The lightDirection is reversed so that it is incident to the fragment as the `reflect` 
    // function expects
    vec3 reflectedDirection = reflect(-lightDirection, normalizedNormal);
    // A vector pointing from the fragment towards the camera 
    // (cameraPosition is assumed to be in world space)
    vec3 viewDirection = normalize(cameraPosition - fragmentPosition);

    float highlightShininess = 32.0;
    float specularComponent = pow(max(dot(viewDirection, reflectedDirection), 0.0), highlightShininess);
    vec3 specularColour = specularStrength * specularComponent * lightColour;

    vec3 finalColour = (ambientColour + diffuseColour + specularColour) * containerColour;
    fragmentColour = vec4(finalColour, 1.0);
}