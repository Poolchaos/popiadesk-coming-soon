export function createRandom(seed = 11) {
    let s = seed;
    return () => {
        s = (s * 1103515245 + 12345) % 2147483648;
        return s / 2147483648;
    };
}
export function particleCount(viewportWidth, hints = {}) {
    const lowPower = (hints.deviceMemory !== undefined && hints.deviceMemory <= 4) ||
        (hints.cores !== undefined && hints.cores <= 4);
    if (viewportWidth < 700)
        return lowPower ? 180 : 420;
    if (lowPower)
        return 600;
    return viewportWidth >= 1600 ? 1900 : 1200;
}
export function seedParticles(count, viewportWidth, viewportHeight, random) {
    const parts = new Array(count);
    for (let i = 0; i < count; i++) {
        parts[i] = {
            x: random() * viewportWidth,
            y: random() * viewportHeight,
            vx: 0,
            vy: 0,
            seed: random() * 1000,
        };
    }
    return parts;
}
export function fieldAngle(x, y, t, frequency, wobble) {
    return Math.sin(y * frequency + t) * Math.cos(x * frequency * 0.8 - t * 0.7) * wobble;
}
export const POINTER_AWAY = { x: -9999, y: -9999 };
const MARK_ASPECT_WIDTH = 33;
const MARK_ASPECT_HEIGHT = 18;
const MARK_SPREAD = 0.95;
const POINTER_RADIUS = 130;
const POINTER_RADIUS_SQ = POINTER_RADIUS * POINTER_RADIUS;
export function stepField(options) {
    const { particles, weights: w, shieldPoints, viewportWidth: vw, viewportHeight: vh, time, pointer, convergeY, out, } = options;
    const shieldScale = Math.min(vw, vh) * (w.shield > 0.9 ? 0.5 : 0.62);
    const cx = vw / 2;
    const cy = vh * 0.5;
    const hasShield = w.shield > 0.01 && shieldPoints.length > 0;
    const hasConverge = w.converge > 0.01 && convergeY !== null;
    const wraps = w.shield < 0.5 && w.converge < 0.5;
    const trail = 5.2 * (1 - w.shield * 0.85);
    const tick = w.shield * 1.6;
    for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        let fx = 0;
        let fy = 0;
        if (w.stream > 0.01) {
            const a = fieldAngle(p.x, p.y, time, 0.004, 2.2) + 0.5;
            fx += (Math.cos(a) * 0.9 + 0.55) * w.stream * 0.35;
            fy += (Math.sin(a) * 0.9 + 0.12) * w.stream * 0.35;
        }
        if (w.chaos > 0.01) {
            const ca = fieldAngle(p.x, p.y, time * 2.4, 0.012, 5);
            fx += Math.cos(ca) * w.chaos * 1.5;
            fy += Math.sin(ca) * w.chaos * 1.5;
        }
        if (w.calm > 0.01) {
            const la = fieldAngle(p.x, p.y, time * 0.5, 0.002, 1.6);
            fx += Math.cos(la) * w.calm * 0.12;
            fy += Math.sin(la) * w.calm * 0.12;
        }
        if (hasShield) {
            const s = shieldPoints[i % shieldPoints.length];
            const tx = cx + s.x * shieldScale * MARK_SPREAD;
            const ty = cy + s.y * shieldScale * MARK_SPREAD * (MARK_ASPECT_HEIGHT / MARK_ASPECT_WIDTH);
            fx += (tx - p.x) * 0.025 * w.shield;
            fy += (ty - p.y) * 0.025 * w.shield;
        }
        if (hasConverge) {
            const angle = p.seed * Math.PI * 2 + time * 0.4;
            const radius = 150 + (p.seed % 1) * Math.min(vw, 520) * 0.45;
            const gx = cx + Math.cos(angle) * radius;
            const gy = convergeY + Math.sin(angle) * radius * 0.45;
            fx += (gx - p.x) * 0.012 * w.converge;
            fy += (gy - p.y) * 0.012 * w.converge;
        }
        const dx = p.x - pointer.x;
        const dy = p.y - pointer.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < POINTER_RADIUS_SQ && d2 > 1) {
            const d = Math.sqrt(d2);
            const f = (1 - d / POINTER_RADIUS) * 1.6;
            fx += (dx / d) * f;
            fy += (dy / d) * f;
        }
        p.vx = (p.vx + fx) * 0.9;
        p.vy = (p.vy + fy) * 0.9;
        p.x += p.vx;
        p.y += p.vy;
        if (wraps) {
            if (p.x < -20)
                p.x = vw + 20;
            else if (p.x > vw + 20)
                p.x = -20;
            if (p.y < -20)
                p.y = vh + 20;
            else if (p.y > vh + 20)
                p.y = -20;
        }
        const o = i * 4;
        out[o] = p.x;
        out[o + 1] = p.y;
        out[o + 2] = p.x - p.vx * trail - 0.3 - tick;
        out[o + 3] = p.y - p.vy * trail - 0.3 - tick;
    }
}
export function fieldStroke(w) {
    const red = w.chaos;
    const r = (38 + red * 172) | 0;
    const g = (92 + red * 26) | 0;
    const b = (150 - red * 60) | 0;
    const alpha = 0.3 + w.shield * 0.34 + w.chaos * 0.18 + w.stream * 0.1 - w.calm * 0.14;
    const a = Math.max(0.05, Math.min(0.85, alpha));
    return `rgba(${r},${g},${b},${a})`;
}
export function sampleMarkPoints(context, random, paths, viewBox, width, height) {
    context.clearRect(0, 0, width, height);
    const [, , boxWidth, boxHeight] = viewBox.split(/\s+/).map(Number);
    context.save();
    context.scale(width / boxWidth, height / boxHeight);
    context.fillStyle = "#fff";
    for (const path of paths) {
        context.fill(new Path2D(path), "evenodd");
    }
    context.restore();
    const data = context.getImageData(0, 0, width, height).data;
    const points = [];
    for (let y = 0; y < height; y += 3) {
        for (let x = 0; x < width; x += 3) {
            if (data[(y * width + x) * 4 + 3] > 100) {
                points.push({ x: x / width - 0.5, y: y / height - 0.5 });
            }
        }
    }
    for (let i = points.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        const tmp = points[i];
        points[i] = points[j];
        points[j] = tmp;
    }
    return points;
}
