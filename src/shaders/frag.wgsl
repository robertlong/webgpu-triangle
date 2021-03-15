[[location(0)]] var<in> vColor : vec3<f32>;

[[location(0)]] var<out> outColor : vec4<f32>;

[[stage(fragment)]]
fn main() -> void {
  outColor = vec4<f32>(vColor, 1.0);
  return;
}