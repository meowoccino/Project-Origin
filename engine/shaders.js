export const shaderCode = /* wgsl */ `
struct Particle {
    pos_x : f32,
    pos_y : f32,
    pos_z : f32,
    col_r : f32,
    col_g : f32,
    col_b : f32,
    size : f32,
    ignition_age : f32,
};

struct CosmicParams {
    cosmic_age_myr : f32,
    expansion_factor : f32,
    zoom_level : f32,
    rot_x : f32,
    rot_y : f32,
    aspect_ratio : f32,
    pad1 : f32,
    pad2 : f32,
};

@group(0) @binding(0) var<storage, read> particles : array<Particle>;
@group(0) @binding(1) var<uniform> params : CosmicParams;

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

    // Hide objects if the universe is younger than their ignition age
    if (params.cosmic_age_myr < p.ignition_age) {
        out.position = vec4<f32>(0.0, 0.0, 0.0, 0.0);
        return out;
    }

    var quad_offsets = array<vec2<f32>, 6>(
        vec2<f32>(-1.0, -1.0), vec2<f32>( 1.0, -1.0), vec2<f32>(-1.0,  1.0),
        vec2<f32>(-1.0,  1.0), vec2<f32>( 1.0, -1.0), vec2<f32>( 1.0,  1.0)
    );
    let offset = quad_offsets[v_idx];
    out.uv = offset;

    // Reconstruct the vectors from flat floats
    let raw_pos = vec3<f32>(p.pos_x, p.pos_y, p.pos_z);
    let raw_col = vec3<f32>(p.col_r, p.col_g, p.col_b);

    // Apply cosmological expansion directly in the shader
    let exp_pos = raw_pos * params.expansion_factor;

    // Apply Camera Rotation
    let cx = cos(params.rot_x); let sx = sin(params.rot_x);
    let cy = cos(params.rot_y); let sy = sin(params.rot_y);

    var pos = vec3<f32>(
        exp_pos.x * cy - exp_pos.z * sy,
        exp_pos.y,
        exp_pos.x * sy + exp_pos.z * cy
    );
    pos = vec3<f32>(
        pos.x,
        pos.y * cx - pos.z * sx,
        pos.y * sx + pos.z * cx
    );

    let camera_dist = 380.0 / max(params.zoom_level, 0.1);
    let depth = pos.z + camera_dist;
    let proj = 1.6 / max(depth, 0.1);

    // Dynamic Appearance based on Age
    var draw_size = p.size * params.zoom_level * 0.05;
    var final_color = vec4<f32>(raw_col, 1.0);

    if (params.cosmic_age_myr < 0.38) {
        final_color = vec4<f32>(1.0, 0.47, 0.2, 0.4); // Hot Plasma
        draw_size *= 3.0;
    } else if (params.cosmic_age_myr < 100.0) {
        // Dark ages cold gas
        if (p_idx % 3u == 0u) {
            final_color = vec4<f32>(0.15, 0.04, 0.23, 0.15); // Dark Matter
        } else {
            final_color = vec4<f32>(0.35, 0.08, 0.5, 0.2); // Hydrogen
        }
        draw_size *= 4.0;
    }

    // --- THE PORTRAIT ASPECT RATIO FIX ---
    var proj_x = pos.x * proj;
    var proj_y = pos.y * proj;
    var quad_x = offset.x * draw_size;
    var quad_y = offset.y * draw_size;

    if (params.aspect_ratio < 1.0) {
        // Phone in Portrait: Scale Y down instead of inflating X
        proj_y *= params.aspect_ratio;
        quad_y *= params.aspect_ratio;
    } else {
        // Desktop/Landscape: Scale X down
        proj_x /= params.aspect_ratio;
        quad_x /= params.aspect_ratio;
    }

    out.position = vec4<f32>(proj_x + quad_x, proj_y + quad_y, clamp(pos.z * 0.001, 0.0, 1.0), 1.0);
    out.color = final_color;
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
