struct Uniforms {
    vp: mat4x4<f32>,
};

struct DirectionalLight {
    direction: vec3<f32>,
    _pad: f32,
    color: vec3<f32>,
    intensity: f32,
};

struct PointLight {
    position: vec3<f32>,
    radius: f32,
    color: vec3<f32>,
    intensity: f32,
};

struct VertexInput {
    @location(0) position: vec3<f32>,
    @location(5) normal: vec3<f32>,
    @location(6) uv: vec2<f32>,
    @location(1) mvp0: vec4<f32>,
    @location(2) mvp1: vec4<f32>,
    @location(3) mvp2: vec4<f32>,
    @location(4) mvp3: vec4<f32>,
};

struct VertexOutput {
    @builtin(position) clipPosition: vec4<f32>,
    @location(0) worldPos: vec3<f32>,
    @location(1) worldNormal: vec3<f32>,
    @location(2) uv: vec2<f32>,
};

struct Material {
    baseColor: vec3<f32>,
    _pad: f32,
    roughness: f32,
    metallic: f32,
};

@group(1) @binding(0) var<uniform> material: Material;

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<uniform> directionalLights: array<DirectionalLight, 4>;
@group(0) @binding(2) var<uniform> pointLights: array<PointLight, 16>;
@group(0) @binding(3) var<uniform> cameraPos: vec3<f32>;
@group(0) @binding(4) var<uniform> lightViewProj: mat4x4<f32>;
@group(0) @binding(5) var shadowSampler: sampler_comparison;
@group(0) @binding(6) var shadowMap: texture_depth_2d;
@group(0) @binding(7) var debugSampler: sampler;


@group(2) @binding(0) var mySampler: sampler;
@group(2) @binding(1) var myTexture: texture_2d<f32>;

@vertex
fn vs_main(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;
    let m = mat4x4<f32>(input.mvp0, input.mvp1, input.mvp2, input.mvp3);
    let worldPos = m * vec4<f32>(input.position, 1.0);
    output.clipPosition = uniforms.vp * worldPos;
    output.worldPos = worldPos.xyz;
    output.worldNormal = normalize((m * vec4<f32>(input.normal, 0.0)).xyz);
    output.uv = input.uv;
    return output;
}

fn shadowFactor(worldPos: vec3<f32>, normal: vec3<f32>, lightDir: vec3<f32>) -> f32 {
    let lightSpace = lightViewProj * vec4<f32>(worldPos, 1.0);
    let proj = lightSpace.xyz / lightSpace.w;
    let uv = proj.xy * vec2<f32>(0.5, -0.5) + 0.5;
    let cosAngle = clamp(dot(normal, lightDir), 0.0, 1.0);
    let bias = 0.0001;//mix(0.0002, 0.0001, cosAngle);
    let texelSize = 1.0 / 2048.0;
    var shadow = 0.0;
    for (var x = -1; x <= 1; x++) {
        for (var y = -1; y <= 1; y++) {
            let offset = vec2<f32>(f32(x), f32(y)) * texelSize;
            shadow += textureSampleCompare(shadowMap, shadowSampler, uv + offset, proj.z - bias);
        }
    }
    shadow = shadow / 9.0;
    let inFrustum = uv.x >= 0.0 && uv.x <= 1.0 && uv.y >= 0.0 && uv.y <= 1.0 && proj.z >= 0.0 && proj.z <= 1.0;

    return select(1.0, shadow, inFrustum);
}

@fragment
fn fs_main(input: VertexOutput) -> @location(0) vec4<f32> {
    let texColor = textureSample(myTexture, mySampler, input.uv);
    let baseColor = material.baseColor * texColor.rgb;

    let normal = normalize(input.worldNormal);
    let viewDir = normalize(cameraPos - input.worldPos);
    let ambient = mix(0.15, 0.3, material.metallic);

    let shininess = clamp(pow(2.0, (1.0 - material.roughness) * 10.0) + 1.0, 1.0, 256.0);



    var diffuse = vec3<f32>(0.0);
    var specular = vec3<f32>(0.0);

    for (var i = 0u; i < 4u; i++) {
        let light = directionalLights[i];
        let lightDir = normalize(-light.direction);

        let diff = max(dot(normal, lightDir), 0.0) * light.intensity;
        diffuse += light.color * diff;

        let halfDir = normalize(lightDir + viewDir);
        let spec = pow(max(dot(normal, halfDir), 0.0), shininess) * light.intensity;
        specular += light.color * spec;
    }

    for (var i = 0u; i < 16u; i++) {
        let light = pointLights[i];
        let toLight = light.position - input.worldPos;
        let dist = length(toLight);
        if dist > light.radius { continue; }
        let attenuation = 1.0 - (dist / light.radius);
        let lightDir = normalize(toLight);

        let diff = max(dot(normal, lightDir), 0.0) * light.intensity * attenuation;
        diffuse += light.color * diff;

        let halfDir = normalize(lightDir + viewDir);
        let spec = pow(max(dot(normal, halfDir), 0.0), shininess) * light.intensity * attenuation;
        specular += light.color * spec;
    }

    let specularColor = mix(vec3<f32>(0.04), material.baseColor, material.metallic);
    let diffuseColor = baseColor * (1.0 - material.metallic);

    let specularStrength = mix(0.5, 1.0, material.metallic);

    let lightDir = normalize(-directionalLights[0].direction);
    let shadow = shadowFactor(input.worldPos, normal, lightDir);
    let color = diffuseColor * (ambient + diffuse * shadow) + specularColor * specular * shadow * specularStrength;


    return vec4<f32>(color, 1.0);
   // let lightSpace = lightViewProj * vec4<f32>(input.worldPos, 1.0);
   // let proj = lightSpace.xyz / lightSpace.w;
   // let uv = proj.xy * vec2<f32>(0.5, -0.5) + 0.5;
   // let storedDepth = textureSample(shadowMap, debugSampler, uv);
   // return vec4<f32>(proj.z, storedDepth, 0.0, 1.0);

}
