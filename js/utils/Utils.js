export function randomColor() {
    const cols = ["#00f3ff", "#bc13fe", "#ffee00", "#ff009d", "#00ff9d"];
    return cols[Math.floor(Math.random() * cols.length)];
}

export function randomRange(min, max) {
    return min + Math.random() * (max - min);
}
