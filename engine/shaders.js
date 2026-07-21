export const shaderCode = /* wgsl */ `
struct Particle {
    position : vec3<f32>,
    mass : f32,
    velocity : vec3<f32>,
    charge : f32,
    net_force : vec3<f32>,
    entropy_decay : f32,
    scale_radius : f32,
    composition : u32,
    pad1 : f32,
    pad2 : f32,
};

struct CosmicParams {
    cosmic_age_myr : f32,
    expansion_rate_h : f32,
    delta_time : f32,
    particle_count : u32,
    zoom_level : f32,
    rot_x : f32,
    rot_y : f32,
    aspect_ratio : f32,
};

@group(0) @binding(0) var<storage, read_write> particles : array<Particle>;
@group(0) @binding(1) var<uniform> params : CosmicParams;

// STRICT WGSL MATH: Explicit vectors required for Android WebGPU
fn hash31(p: f32) -> vec3<f32> {
    var p3 = fract(vec3<f32>(p * 0.1031, p * 0.1030, p * 0.0973));
    let d = dot(p3, p3.yzx + vec3<f32>(33.33, 33.33, 33.33));
    p3 = p3 + vec3<f32>(d, d, d);
    return fract((p3.xxy + p3.yzz) * p3.zyx) * 2.0 - 1.0;
}

@compute @workgroup_size(256)
fn init_big_bang(@builtin(global_invocation_id) global_id : vec3<u32>) {
    let index = global_id.x;
    if (index >= params.particle_count) { return; }

    let seed = f32(index);
    let dir = normalize(hash31(seed) + vec3<f32>(0.001, 0.001, 0.001));
    let noise = length(hash31(seed + 100.0));

    let radius = 25.0 * pow(noise, 0.5) + 0.5;
    particles[index].position = dir * radius;

    let speed = 8.0 + (noise * 12.0);
    let up = vec3<f32>(0.0, 1.0, 0.0);
    particles[index].velocity = cross(dir, up) * speed;

    if (noise > 0.85) {
        particles[index].mass = 120.0;
        particles[index].composition = 2u;
        particles[index].scale_radius = 2.5;
    } else if (noise > 0.3) {
        particles[index].mass = 15.0;
        particles[index].composition = 1u;
        particles[index].scale_radius = 1.2;
    } else {
        particles[index].mass = 45.0;
        particles[index].composition = 0u;
        particles[index].scale_radius = 0.8;
    }

    particles[index].net_force = vec3<f32>(0.0, 0.0, 0.0);
    particles[index].entropy_decay = 0.01;
}

@compute @workgroup_size(256)
fn update_physics(@builtin(global_invocation_id) global_id : vec3<u32>) {
    let index = global_id.x;
    if (index >= params.particle_count) { return; }

    var p = particles[index];
    let dt = params.delta_time;
    let G: f32 = 0.25;

    let center_dist = length(p.position);
    let force_mag = (G * 500.0) / (center_dist * center_dist + 5.0);
    let center_force = -normalize(p.position + vec3<f32>(0.001, 0.001, 0.001)) * force_mag;

    p.velocity = p.velocity + (center_force / max(p.mass, 0.1)) * dt;
    p.position = p.position + (p.velocity * dt);

    particles[index] = p;
}

struct VertexOutput {
    @builtin(position) position : vec4<f32>,
    @location(0) color : vec4<f32>,
    @location(1) uv : vec2<f32>,
};

@vertex
fn vs_main(
    @builtin(vertex_index) v_idx : u32,
    @builtin(instance_index) p_idx : u32
) -> VertexOutput {
    var out: VertexOutput;
    let p = particles[p_idx];

    var quad_offsets = array<vec2<f32>, 6>(
        vec2<f32>(-1.0, -1.0),
        vec2<f32>( 1.0, -1.0),
        vec2<f32>(-1.0,  1.0),
        vec2<f32>(-1.0,  1.0),
        vec2<f32>( 1.0, -1.0),
        vec2<f32>( 1.0,  1.0)
    );

    let offset = quad_offsets[v_idx];
    out.uv = offset;

    let cx = cos(params.rot_x);
    let sx = sin(params.rot_x);
    let cy = cos(params.rot_y);
    let sy = sin(params.rot_y);

    var pos = vec3<f32>(
        p.position.x * cy + p.position.z * sy,
        p.position.y,
        -p.position.x * sy + p.position.z * cy
    );

    pos = vec3<f32>(
        pos.x,
        pos.y * cx - pos.z * sx,
        pos.y * sx + pos.z * cx
    );

    let camera_dist = 60.0 / max(params.zoom_level, 0.1);
    let depth = pos.z + camera_dist;
    let proj = 1.6 / max(depth, 0.1);

    // Star sizes significantly increased for mobile visibility
    let star_size = p.scale_radius * 0.06 * params.zoom_level;
    let proj_pos = vec2<f32>(
        (pos.x * proj) / params.aspect_ratio + offset.x * star_size,
        pos.y * proj + offset.y * star_size * params.aspect_ratio
    );

    out.position = vec4<f32>(proj_pos, clamp(pos.z * 0.001, 0.0, 1.0), 1.0);

    if (p.composition == 2u) {
        out.color = vec4<f32>(1.0, 0.8, 0.3, 1.0); // Gold
    } else if (p.composition == 1u) {
        out.color = vec4<f32>(0.3, 0.85, 1.0, 0.9); // Cyan
    } else {
        out.color = vec4<f32>(0.6, 0.25, 1.0, 0.5); // Purple
    }

    return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
    let dist = length(in.uv);
    if (dist > 1.0) { discard; }

    let alpha = (1.0 - dist) * (1.0 - dist);
    return vec4<f32>(in.color.rgb, in.color.a * alpha);
}
`;
