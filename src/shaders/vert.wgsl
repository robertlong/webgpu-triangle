[[location(0)]] var<in> POSITION : vec3<f32>;
[[location(1)]] var<in> COLOR_0 : vec3<f32>;

[[location(0)]] var<out> vColor : vec3<f32>;
[[builtin(position)]] var<out> outPosition : vec4<f32>;

[[block]] struct UBO {
  [[offset(0)]] modelViewProj : mat4x4<f32>;
  [[offset(64)]] primaryColor : vec4<f32>;
  [[offset(80)]] accentColor : vec4<f32>;
};
[[binding(0), group(0)]] var<uniform> ubo : UBO;

[[stage(vertex)]]
fn main() -> void {
  vColor = COLOR_0;
  outPosition = ubo.modelViewProj * vec4<f32>(POSITION, 1.0);
  return;
}