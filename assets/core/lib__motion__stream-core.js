export function clamp01(v) {
    return v < 0 ? 0 : v > 1 ? 1 : v;
}
export function seg(p, a, b) {
    if (b === a)
        return p >= b ? 1 : 0;
    return clamp01((p - a) / (b - a));
}
export function easeOutQuart(t) {
    return 1 - Math.pow(1 - clamp01(t), 4);
}
export function snapEase(t) {
    const c = clamp01(t);
    return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
}
export function smoothScroll(current, target) {
    const velocity = current.velocity * 0.85 + (target - current.position) * 0.15;
    const position = current.position + (target - current.position) * 0.11;
    return { position, velocity };
}
export function pinProgress(scene, scrollPosition, viewportHeight) {
    if (!scene)
        return 0;
    const run = scene.height - viewportHeight;
    if (run <= 0)
        return scrollPosition >= scene.top ? 1 : 0;
    return clamp01((scrollPosition - scene.top) / run);
}
export const RESTING_WEIGHTS = {
    shield: 0,
    stream: 1,
    chaos: 0,
    calm: 0,
    converge: 0,
};
export const ARRIVAL_SECONDS = 3.4;
export function arrivalWeights(elapsedSeconds) {
    if (elapsedSeconds >= ARRIVAL_SECONDS)
        return null;
    const gather = easeOutQuart(seg(elapsedSeconds, 0, 1.1));
    const release = snapEase(seg(elapsedSeconds, 2.2, ARRIVAL_SECONDS));
    const shield = gather * (1 - release);
    return {
        shield,
        stream: release,
        chaos: 0,
        calm: 0,
        converge: 0,
    };
}
export function mazeJourney(stakesProgress, turnProgress) {
    const turn = clamp01(turnProgress);
    if (turn > 0)
        return 0.5 + turn * 0.5;
    return clamp01(stakesProgress) * 0.5;
}
export function journeyWeights(mazeProgress, inviteVisibility) {
    const mp = clamp01(mazeProgress);
    const invite = clamp01(inviteVisibility);
    if (mp <= 0.01) {
        return { ...RESTING_WEIGHTS, converge: invite * 0.9 };
    }
    if (mp >= 0.999) {
        return {
            shield: 0,
            stream: 0,
            chaos: 0,
            calm: 1 - invite,
            converge: invite * 0.9,
        };
    }
    const chaosIn = easeOutQuart(seg(mp, 0.04, 0.24));
    const morph = snapEase(seg(mp, 0.52, 0.66));
    const settle = seg(mp, 0.72, 0.86);
    return {
        stream: (1 - chaosIn) * (1 - clamp01(mp * 4)),
        chaos: chaosIn * (1 - morph),
        shield: morph * (1 - settle),
        calm: Math.max(0, settle - invite),
        converge: invite * 0.9,
    };
}
export function formatRand(value) {
    const negative = value < 0;
    let digits = String(Math.round(Math.abs(value)));
    let out = "";
    while (digits.length > 3) {
        out = " " + digits.slice(-3) + out;
        digits = digits.slice(0, -3);
    }
    return (negative ? "-R" : "R") + digits + out;
}
export function activeStop(stops, scrollPosition, viewportHeight) {
    let current = 0;
    for (let i = 0; i < stops.length; i++) {
        if (stops[i].top - scrollPosition < viewportHeight * 0.4)
            current = i;
    }
    return current;
}
