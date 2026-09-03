const canvas = document.getElementById('map');
const context = canvas.getContext('2d');
const countInput = document.getElementById('vertex-count');
const countOutput = document.getElementById('vertex-count-value');
const seedInput = document.getElementById('seed');
let vertices = [];
let solutionPath = [];
let requestNumber = 0;
let activeWorker;

function random(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
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
  if (path.length) {
    context.strokeStyle = '#f27d52'; context.lineWidth = 3;
    context.beginPath(); path.forEach((index, step) => { const p = point(points[index]); if (!step) context.moveTo(p.x, p.y); else context.lineTo(p.x, p.y); }); context.stroke();
  }
  points.forEach((vertex, index) => {
    const p = point(vertex); const radius = 7 + vertex.probability * 14;
    context.beginPath(); context.fillStyle = index === 0 ? '#1e2c28' : '#c7e86b'; context.arc(p.x, p.y, radius, 0, Math.PI * 2); context.fill();
    context.strokeStyle = index === 0 ? '#f27d52' : '#1e2c28'; context.lineWidth = 2; context.stroke();
    context.fillStyle = index === 0 ? '#fff' : '#17231f'; context.font = '500 11px Manrope, sans-serif'; context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillText(index === 0 ? 'S' : index, p.x, p.y);
    context.fillStyle = '#52645d'; context.font = '11px Manrope, sans-serif'; context.fillText(`${Math.round(vertex.probability * 100)}%`, p.x, p.y + radius + 14);
  });
}

function setResult(result, objective) {
  solutionPath = result.path || [];
  draw(vertices, solutionPath);
  document.getElementById('status').textContent = result.timeout ? 'Time limit' : 'Solved';
  document.getElementById('objective-value').textContent = objective === 'min-max' ? 'Min-max' : 'Min-sum';
  document.getElementById('cost').textContent = Number.isFinite(result.final_cost) ? result.final_cost.toFixed(3) : '--';
  document.getElementById('states').textContent = Number(result.n_expanded).toLocaleString();
  document.getElementById('route').textContent = solutionPath.join(' → ') || '--';
}

async function generate() {
  const currentRequest = ++requestNumber;
  const nextRandom = random(Number(seedInput.value) || 0);
  const count = Number(countInput.value);
  vertices = Array.from({ length: count }, (_, id) => ({ id, x: .08 + nextRandom() * .84, y: .08 + nextRandom() * .84, probability: .15 + nextRandom() * .85 }));
  const objective = document.querySelector('input[name="objective"]:checked').value;
  solutionPath = [];
  draw(vertices, solutionPath);
  document.getElementById('status').textContent = 'Solving…';
  document.getElementById('objective-value').textContent = objective === 'min-max' ? 'Min-max' : 'Min-sum';
  ['cost', 'states', 'route'].forEach((id) => { document.getElementById(id).textContent = '--'; });
  const button = document.getElementById('generate');
  button.disabled = true;
  if (activeWorker) activeWorker.terminate();
  activeWorker = new Worker('solver-worker.js');
  const worker = activeWorker;
  try {
    const result = await new Promise((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        worker.terminate();
        reject(new Error('Solver exceeded the 10 second limit'));
      }, 12000);
      worker.addEventListener('message', ({ data }) => {
        window.clearTimeout(timeout);
        if (data.error) reject(new Error(data.error)); else resolve(data.result);
      }, { once: true });
      worker.addEventListener('error', (event) => {
        window.clearTimeout(timeout);
        reject(new Error(event.message || 'Unable to load the WebAssembly solver'));
      }, { once: true });
      worker.postMessage({ vertices, solver: objective, timeLimit: 10, start: 0, heuristic: 'pt', dominance: 'state' });
    });
    if (currentRequest === requestNumber) setResult(result, objective);
  } catch (error) {
    if (currentRequest === requestNumber) {
      document.getElementById('status').textContent = 'Unavailable';
      document.getElementById('route').textContent = error.message;
    }
  } finally {
    worker.terminate();
    if (activeWorker === worker) activeWorker = undefined;
    if (currentRequest === requestNumber) button.disabled = false;
  }
}

countInput.addEventListener('input', () => { countOutput.value = countInput.value; });
document.getElementById('generate').addEventListener('click', generate);
document.querySelectorAll('input[name="objective"]').forEach((input) => input.addEventListener('change', generate));
window.addEventListener('resize', () => { if (vertices.length) draw(vertices, solutionPath); });
generate();
