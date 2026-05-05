

@group(0) @binding(1)
var<uniform> lights: array<DirectionalLight, 4>;

struct VertexOutput {
    @builtin(position) clipPosition: vec4<f32>,
    @location(0) worldPos: vec3<f32>,
    @location(1) worldNormal: vec3<f32>,
};

@fragment
fn fs_main(input: VertexOutput) -> @location(0) vec4<f32> {
    let baseColor = vec3<f32>(
        input.worldPos.x + 0.5,
        input.worldPos.y + 0.5,
        input.worldPos.z + 0.5,
    );

    let ambient = 0.15;
    var diffuse = vec3<f32>(0.0, 0.0, 0.0);

    for (var i = 0u; i < 4u; i++) {
        let light = lights[i];
        let contribution = max(
            dot(input.worldNormal, normalize(-light.direction)),
            0.0
        ) * light.intensity;
        diffuse += light.color * contribution;
    }

    return vec4<f32>(baseColor * (ambient + diffuse), 1.0);
}