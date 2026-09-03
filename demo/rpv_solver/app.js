const canvas = document.getElementById('map');
const context = canvas.getContext('2d');
const countInput = document.getElementById('vertex-count');
const countOutput = document.getElementById('vertex-count-value');
const seedInput = document.getElementById('seed');
let vertices = [];

function random(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

// This mirrors the repository's min-sum recurrence: q' = q + c(u, v), g' = g + p(v) * q'.
function solve(points, objective) {
  const size = points.length;
  const costs = Array.from({ length: size }, (_, from) => points.map((to) => distance(points[from], to)));
  let bestCost = Infinity;
  let bestPath = [];
  let expanded = 0;
  function visit(last, remaining, routeCost, distanceSoFar, path) {
    expanded += 1;
    if (!remaining) {
      if (routeCost < bestCost) { bestCost = routeCost; bestPath = [...path]; }
      return;
    }
    for (let next = 1; next < size; next += 1) {
      if (!(remaining & (1 << next))) continue;
      const edgeCost = costs[last][next];
      const arrivalCost = points[next].probability * (distanceSoFar + edgeCost);
      const nextCost = objective === 'min-max' ? Math.max(routeCost, arrivalCost) : routeCost + arrivalCost;
      visit(next, remaining ^ (1 << next), nextCost, distanceSoFar + edgeCost, [...path, next]);
    }
  }
  visit(0, ((1 << size) - 1) ^ 1, 0, 0, [0]);
  return { path: bestPath, cost: bestCost, expanded };
}

function resizeCanvas() {
  const scale = window.devicePixelRatio || 1;
  const bounds = canvas.getBoundingClientRect();
  canvas.width = bounds.width * scale;
  canvas.height = bounds.height * scale;
  context.setTransform(scale, 0, 0, scale, 0, 0);
  return bounds;
}

function draw(points, path) {
  const bounds = resizeCanvas();
  context.clearRect(0, 0, bounds.width, bounds.height);
  context.strokeStyle = '#dfe6df';
  context.lineWidth = 1;
  for (let x = 25; x < bounds.width; x += 38) { context.beginPath(); context.moveTo(x, 0); context.lineTo(x, bounds.height); context.stroke(); }
  for (let y = 25; y < bounds.height; y += 38) { context.beginPath(); context.moveTo(0, y); context.lineTo(bounds.width, y); context.stroke(); }
  const margin = 44;
  const point = (vertex) => ({ x: margin + vertex.x * (bounds.width - margin * 2), y: margin + vertex.y * (bounds.height - margin * 2) });
  context.lineCap = 'round'; context.lineJoin = 'round';
  context.strokeStyle = '#f27d52'; context.lineWidth = 3;
  context.beginPath(); path.forEach((index, step) => { const p = point(points[index]); if (!step) context.moveTo(p.x, p.y); else context.lineTo(p.x, p.y); }); context.stroke();
  points.forEach((vertex, index) => {
    const p = point(vertex); const radius = 7 + vertex.probability * 14;
    context.beginPath(); context.fillStyle = index === 0 ? '#1e2c28' : '#c7e86b'; context.arc(p.x, p.y, radius, 0, Math.PI * 2); context.fill();
    context.strokeStyle = index === 0 ? '#f27d52' : '#1e2c28'; context.lineWidth = 2; context.stroke();
    context.fillStyle = index === 0 ? '#fff' : '#17231f'; context.font = '500 11px DM Mono, monospace'; context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillText(index === 0 ? 'S' : index, p.x, p.y);
    context.fillStyle = '#52645d'; context.font = '11px DM Mono, monospace'; context.fillText(`${Math.round(vertex.probability * 100)}%`, p.x, p.y + radius + 14);
  });
}

function generate() {
  const nextRandom = random(Number(seedInput.value) || 0);
  const count = Number(countInput.value);
  vertices = Array.from({ length: count }, (_, index) => ({ x: .08 + nextRandom() * .84, y: .08 + nextRandom() * .84, probability: index === 0 ? 0 : .15 + nextRandom() * .85 }));
  const objective = document.querySelector('input[name="objective"]:checked').value;
  const result = solve(vertices, objective);
  draw(vertices, result.path);
  document.getElementById('status').textContent = 'Solved';
  document.getElementById('objective-value').textContent = objective === 'min-max' ? 'Min-max' : 'Min-sum';
  document.getElementById('cost').textContent = result.cost.toFixed(2);
  document.getElementById('states').textContent = result.expanded.toLocaleString();
  document.getElementById('route').textContent = result.path.join(' → ');
}

countInput.addEventListener('input', () => { countOutput.value = countInput.value; });
document.getElementById('generate').addEventListener('click', generate);
document.querySelectorAll('input[name="objective"]').forEach((input) => input.addEventListener('change', generate));
window.addEventListener('resize', () => {
  if (vertices.length) draw(vertices, solve(vertices, document.querySelector('input[name="objective"]:checked').value).path);
});
generate();
