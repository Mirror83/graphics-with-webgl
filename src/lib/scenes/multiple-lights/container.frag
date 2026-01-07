#version 300 es
precision highp float;

struct Material {
    // Texture to be used for diffuse colours of the object
    sampler2D diffuse;
    sampler2D specular;
    float shininess;
};

struct DirectionalLight {
    vec3 direction;

    vec3 ambient;
    vec3 diffuse;
    vec3 specular;
};

struct PointLight {
    vec3 position;

    vec3 ambient;
    vec3 diffuse;
    vec3 specular;

    float constant;
    float linear;
    float quadratic;
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

uniform DirectionalLight directionalLight;
#define NO_OF_POINT_LIGHTS 4
uniform PointLight pointLights[NO_OF_POINT_LIGHTS];
uniform Spotlight spotlight;

vec3 getTextureColour(sampler2D sampler) {
    return vec3(texture(sampler, textureFragmentCoord));
}

vec3 calculateDirectionalLight(
    DirectionalLight light,
    vec3 normal,
    vec3 viewDirection
) {
    vec3 lightDirection = normalize(-light.direction);
    float incidentAngleCosine = max(dot(normal, lightDirection), 0.0f);

    vec3 reflectionDirection = reflect(-lightDirection, normal);
    float specularComponent = pow(max(dot(viewDirection, reflectionDirection), 0.0f), material.shininess);

    vec3 diffuseTextureColour = getTextureColour(material.diffuse);
    vec3 specularTextureColour = getTextureColour(material.specular);

    vec3 ambientColour = light.ambient * diffuseTextureColour;
    vec3 diffuseColour = light.diffuse * incidentAngleCosine * diffuseTextureColour;
    vec3 specularColour = light.specular * specularComponent * specularTextureColour;

    return (ambientColour + diffuseColour + specularColour);
}

vec3 calculatePointLight(PointLight light, vec3 normal, vec3 fragmentPosition, vec3 viewDirection) {
    vec3 lightDirection = normalize(light.position - fragmentPosition);
    float incidentAngleCosine = max(dot(normal, lightDirection), 0.0f);

    vec3 reflectionDirection = reflect(-lightDirection, normal);
    float specularComponent = pow(max(dot(viewDirection, reflectionDirection), 0.0f), material.shininess);

    vec3 diffuseTextureColour = getTextureColour(material.diffuse);
    vec3 specularTextureColour = getTextureColour(material.specular);

    float distanceFromLight = length(light.position - fragmentPosition);
    float attenuation = 1.0f /
        (light.constant +
        light.linear * distanceFromLight +
        light.quadratic * (distanceFromLight * distanceFromLight));

    vec3 ambientColour = light.ambient * diffuseTextureColour;
    vec3 diffuseColour = light.diffuse * incidentAngleCosine * diffuseTextureColour;
    vec3 specularColour = light.specular * specularComponent * specularTextureColour;

    ambientColour *= attenuation;
    diffuseColour *= attenuation;
    specularColour *= attenuation;

    return (ambientColour + diffuseColour + specularColour);
}

vec3 calculateSpotlight(Spotlight light, vec3 normal, vec3 fragmentPosition, vec3 viewDirection) {
    vec3 lightDirection = normalize(light.position - fragmentPosition);
    float incidentAngleCosine = max(dot(normal, lightDirection), 0.0f);

    vec3 reflectionDirection = reflect(-lightDirection, normal);
    float specularComponent = pow(max(dot(viewDirection, reflectionDirection), 0.0f), material.shininess);

    vec3 diffuseTextureColour = getTextureColour(material.diffuse);
    vec3 specularTextureColour = getTextureColour(material.specular);

    float distanceFromLight = length(light.position - fragmentPosition);
    float attenuation = 1.0f /
        (light.constant +
        light.linear * distanceFromLight +
        light.quadratic * (distanceFromLight * distanceFromLight));

    // Change the light direction to be a vector pointing from the fragment to the light source
    // as the lighting calculations below expect
    vec3 lightDirectionFromFragment = normalize(spotlight.position - fragmentPosition);

    float theta = dot(lightDirectionFromFragment, normalize(-spotlight.direction));
    float epsilon = spotlight.cutOffCosine - spotlight.outerCutOffCosine;
    float intensity = clamp((theta - spotlight.outerCutOffCosine) / epsilon, 0.0f, 1.0f);

    vec3 ambientColour = light.ambient * diffuseTextureColour;
    vec3 diffuseColour = light.diffuse * incidentAngleCosine * diffuseTextureColour;
    vec3 specularColour = light.specular * specularComponent * specularTextureColour;

    ambientColour *= attenuation;
    diffuseColour *= intensity * attenuation;
    specularColour *= intensity * attenuation;

    return (ambientColour + diffuseColour + specularColour);
}

void main() {
    vec3 normal = normalize(fragmentNormal);
    vec3 viewDirection = normalize(cameraPosition - fragmentPosition);

    vec3 finalColour = calculateDirectionalLight(directionalLight, normal, viewDirection);
    for(int i = 0; i < NO_OF_POINT_LIGHTS; i++) {
        finalColour += calculatePointLight(pointLights[i], normal, fragmentPosition, viewDirection);
    }
    finalColour += calculateSpotlight(spotlight, normal, fragmentPosition, viewDirection);

    fragmentColour = vec4(finalColour, 1.0f);
}