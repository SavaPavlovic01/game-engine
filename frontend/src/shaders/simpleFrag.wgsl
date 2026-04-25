@fragment
fn fs_main(input: VertexOutput) -> @location(0) vec4<f32> {
    return vec4<f32>(
        input.worldPos.x + 0.5,
        input.worldPos.y + 0.5,
        input.worldPos.z + 0.5,
        1.0
    );
}