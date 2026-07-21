// ============================================================================
// PROJECT ORIGIN: PHYSICAL UNIVERSE COMPUTE SHADER
// Features: 8 Physical State Attributes + Big Bang Expansion Dynamics
// ============================================================================

// --- THE 8 PHYSICAL STATE ATTRIBUTES (64-Byte GPU Alignment) ---
struct Particle {
    // 1. Position (x, y, z) & 3. Mass
    position : vec3<f32>,
    mass : f32,

    // 2. Velocity (vx, vy, vz) & 4. Charge
    velocity : vec3<f32>,
    charge : f32,

    // 8. Net Force Vector & 7. Entropy / Decay
    net_force : vec3<f32>,
    entropy_decay : f32,

    // 5. Scale / Radius & 6. Composition & Alignment Padding
    scale_radius : f32,
    composition : u32,      // 0 = Dark Matter, 1 = Hydrogen Gas, 2 = Stellar Metal
    pad1 : f32,
    pad2 : f32,
};

// Global Cosmic Parameters (Updated every frame from JS)
struct CosmicParams {
    cosmic_age_myr : f32,
    expansion_rate_h : f32, // Hubble metric expansion
    delta_time : f32,       // Step size dt
    particle_count : u32,
};

@group(0) @binding(0) var<storage, read_write> particles : array<Particle>;
@group(0) @binding(1) var<uniform> params : CosmicParams;

// Pseudo-Random Generator for Primordial Quantum Fluctuations
fn hash31(p: f32) -> vec3<f32> {
    var p3 = fract(vec3<f32>(p * 0.1031, p * 0.1030, p * 0.0973));
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.xxy + p3.yzz) * p3.zyx) * 2.0 - 1.0;
}

// --- 1. BIG BANG INITIALIZATION SHADER ---
@compute @workgroup_size(256)
fn init_big_bang(@builtin(global_invocation_id) global_id : vec3<u32>) {
    let index = global_id.x;
    if (index >= params.particle_count) { return; }

    let seed = f32(index);
    let random_dir = normalize(hash31(seed));
    let noise_factor = length(hash31(seed + 100.0));

    // A. Singularity Core Placement (Near 0,0,0 with high primordial density)
    let primordial_radius = 0.05 * noise_factor;
    particles[index].position = random_dir * primordial_radius;

    // B. High-Velocity Inflation Wavefront
    let expansion_speed = 80.0 + (noise_factor * 40.0);
    particles[index].velocity = random_dir * expansion_speed;

    // C. Attribute Assignation: Dark Matter vs Baryonic Matter Ratio (85/15)
    if (noise_factor > 0.15) {
        // Dark Matter Node (Provides invisible gravitational structure)
        particles[index].mass = 100.0 * noise_factor;
        particles[index].charge = 0.0;
        particles[index].composition = 0u; // Dark Matter
        particles[index].scale_radius = 0.1;
    } else {
        // Baryonic Matter (Gas / Star potential)
        particles[index].mass = 10.0 * noise_factor;
        particles[index].charge = hash31(seed + 200.0).x * 0.5;
        particles[index].composition = 1u; // Hydrogen Gas
        particles[index].scale_radius = 0.5;
    }

    particles[index].net_force = vec3<f32>(0.0);
    particles[index].entropy_decay = 0.01; // Fresh primordial state
}

// --- 2. REALTIME PHYSICS INTEGRATION LOOP ---
@compute @workgroup_size(256)
fn update_physics(@builtin(global_invocation_id) global_id : vec3<u32>) {
    let index = global_id.x;
    if (index >= params.particle_count) { return; }

    var p = particles[index];
    let dt = params.delta_time;

    // A. Acceleration Calculation from Accumulated AI & Local Forces (a = F / m)
    let acceleration = p.net_force / max(p.mass, 0.001);

    // B. Update Velocity (v = v0 + a * dt)
    p.velocity += acceleration * dt;

    // C. Cosmic Metric Expansion (Space itself stretching over time)
    let hubble_vector = p.position * (params.expansion_rate_h * 0.0001 * dt);
    
    // D. Update Position (x = x0 + v * dt + expansion)
    p.position += (p.velocity * dt) + hubble_vector;

    // E. Natural Entropy Decay (Stars aging / volatile dissipation)
    p.entropy_decay = min(p.entropy_decay + (0.0001 * dt), 1.0);

    // F. Reset Force Vector for Next Frame Calculation
    p.net_force = vec3<f32>(0.0);

    // Write Back to GPU Storage Buffer
    particles[index] = p;
}
