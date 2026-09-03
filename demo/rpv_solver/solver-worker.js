let modulePromise;

function loadSolver() {
  if (!modulePromise) {
    importScripts('rpv_solver.js');
    modulePromise = createRPVSolver({ locateFile: (file) => file });
  }
  return modulePromise;
}

self.addEventListener('message', async ({ data }) => {
  try {
    const module = await loadSolver();
    const graph = JSON.stringify({ vertex_count: data.vertices.length, vertices: data.vertices });
    const json = module.solveJson(
      graph,
      data.solver,
      data.timeLimit,
      data.start,
      data.heuristic,
      data.dominance,
    );
    const result = JSON.parse(json);
    if (result.error) self.postMessage({ error: result.error });
    else self.postMessage({ result });
  } catch (error) {
    self.postMessage({ error: error?.message || String(error) });
  }
});
