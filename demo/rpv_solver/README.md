# RPV* solver demo

`rpv_solver.js` and `rpv_solver.wasm` are build artifacts, not hand-written
sources. They are the RPV* C++ solver compiled to WebAssembly from the
`dev_rpv_star` repository:

```bash
cd ../dev_rpv_star
scripts/build_wasm.sh          # writes both files back into this folder
```

`solver-worker.js` loads the module inside a web worker and calls the single
exported binding, which takes the same instance JSON and returns the same
result JSON as the `solve_graph` command-line tool:

```js
solveJson(instance_json, solver, time_limit, start_vertex, heuristic, dominance)
```

Regenerate and commit both files whenever the solver changes.
