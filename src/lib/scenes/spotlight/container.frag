#version 300 es
precision highp float;

struct Material {
    // Texture to be used for diffuse colours of the object
    sampler2D diffuse;
    sampler2D specular;
    float shininess;
};

/** 
* A light that shoots rays in a specific direction, 
* instead of every direction. Only the objects within a certain
* radius of the spotlight's direction are lit.
* e.g. a torch or headlamp 
*/
struct Spotlight {
    vec3 position;
    // The direction the light rays should be shot into
    vec3 direction;
    // The cosine of the cut-off angle that specifies the spotlight's radius
    float cutOffCosine;
    float outerCutOffCosine;

    vec3 ambient;
    vec3 diffuse;
    vec3 specular;

    float constant;
    float linear;
    float quadratic;
};

in vec3 fragmentNormal;
in vec3 fragmentPosition;
in vec2 textureFragmentCoord;

out vec4 fragmentColour;

uniform vec3 cameraPosition;
uniform Material material;
uniform Spotlight light;

void main() {
    vec3 finalColour = vec3(1.0f);
    vec3 diffuseMapTextureColour = vec3(texture(material.diffuse, textureFragmentCoord));
    vec3 ambientColour = diffuseMapTextureColour * light.ambient;

    // Both lightPosition and fragmentPosition are assumed to be defined in world space
    vec3 normalizedNormal = normalize(fragmentNormal);
    // Change the light direction to be a vector pointing from the fragment to the light source
    // as the lighting calculations below expect
    vec3 lightDirectionFromFragment = normalize(light.position - fragmentPosition);

    float theta = dot(lightDirectionFromFragment, normalize(-light.direction));
    float epsilon = light.cutOffCosine - light.outerCutOffCosine;
    float intensity = clamp((theta - light.outerCutOffCosine) / epsilon, 0.0f, 1.0f);

    vec3 specularMapTextureColour = vec3(texture(material.specular, textureFragmentCoord));

        // The cosine of the angle between the normal and the light direction.
        // This tells us the diffuse impact of the light on the current fragment
        // i.e the closer the value is to 90 deg the angle is, the stronger the influence
        // of the light on the colour of the object and vice versa
    float diff = max(dot(normalizedNormal, lightDirectionFromFragment), 0.0f);
    vec3 diffuseColour = (diff * diffuseMapTextureColour) * light.diffuse;

        // The direction of the lightDirection vector reflected around the normal of the fragment
        // The lightDirection is reversed so that it is incident to the fragment as the `reflect` 
        // function expects
    vec3 reflectedDirection = reflect(-lightDirectionFromFragment, normalizedNormal);
        // A vector pointing from the fragment towards the camera 
        // (cameraPosition is assumed to be in world space)
    vec3 viewDirection = normalize(cameraPosition - fragmentPosition);
    float specularComponent = pow(max(dot(viewDirection, reflectedDirection), 0.0f), material.shininess);
    vec3 specularColour = (specularMapTextureColour * specularComponent) * light.specular;

    float distanceFromLight = length(light.position - fragmentPosition);
    float attenuation = 1.0f /
        (light.constant +
        light.linear * distanceFromLight +
        light.quadratic * (distanceFromLight * distanceFromLight));

    ambientColour *= attenuation;
    diffuseColour *= attenuation * intensity;
    specularColour *= attenuation * intensity;

    finalColour = (ambientColour + diffuseColour + specularColour);

    fragmentColour = vec4(finalColour, 1.0f);
}