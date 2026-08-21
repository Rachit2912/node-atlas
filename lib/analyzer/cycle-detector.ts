export interface CycleResult {
  id: string;
  length: number;
  path: string[];
  pathString: string;
}

export function detectCycles(adjacencyList: Map<string, string[]>): CycleResult[] {
  let index = 0;
  const stack: string[] = [];
  const inStack = new Set<string>();
  const indices = new Map<string, number>();
  const lowLink = new Map<string, number>();
  const sccs: string[][] = [];

  function strongConnect(node: string) {
    indices.set(node, index);
    lowLink.set(node, index);
    index++;
    stack.push(node);
    inStack.add(node);

    const neighbors = adjacencyList.get(node) || [];
    for (const neighbor of neighbors) {
      if (!indices.has(neighbor)) {
        strongConnect(neighbor);
        lowLink.set(node, Math.min(lowLink.get(node)!, lowLink.get(neighbor)!));
      } else if (inStack.has(neighbor)) {
        lowLink.set(node, Math.min(lowLink.get(node)!, indices.get(neighbor)!));
      }
    }

    if (lowLink.get(node) === indices.get(node)) {
      const scc: string[] = [];
      let w: string;
      do {
        w = stack.pop()!;
        inStack.delete(w);
        scc.push(w);
      } while (w !== node);

      if (scc.length > 1) {
        sccs.push(scc);
      } else if (scc.length === 1) {
        if ((adjacencyList.get(scc[0]) || []).includes(scc[0])) {
          sccs.push(scc);
        }
      }
    }
  }

  for (const node of Array.from(adjacencyList.keys())) {
    if (!indices.has(node)) {
      strongConnect(node);
    }
  }

  const rawCycles: string[][] = [];

  for (const scc of sccs) {
    const sccSet = new Set(scc);
    const subAdj = new Map<string, string[]>();
    for (const u of scc) {
      const neighbors = (adjacencyList.get(u) || []).filter((v) => sccSet.has(v));
      subAdj.set(u, neighbors);
    }

    if (scc.length === 1) {
      rawCycles.push([scc[0], scc[0]]);
      continue;
    }

    const visitedInDfs = new Set<string>();
    const currentPath: string[] = [];

    function findCyclesDFS(curr: string, startNode: string) {
      currentPath.push(curr);
      visitedInDfs.add(curr);

      const neighbors = subAdj.get(curr) || [];
      for (const next of neighbors) {
        if (next === startNode && currentPath.length > 1) {
          rawCycles.push([...currentPath, startNode]);
        } else if (!visitedInDfs.has(next)) {
          findCyclesDFS(next, startNode);
        }
      }

      currentPath.pop();
      visitedInDfs.delete(curr);
    }

    for (const startNode of scc) {
      findCyclesDFS(startNode, startNode);
    }
  }

  const uniqueCyclesMap = new Map<string, string[]>();

  for (const cycle of rawCycles) {
    const loop = cycle.slice(0, cycle.length - 1);
    const minIndex = loop.indexOf([...loop].sort()[0]);
    const normalized = [...loop.slice(minIndex), ...loop.slice(0, minIndex)];
    const key = normalized.join(' -> ');
    if (!uniqueCyclesMap.has(key)) {
      uniqueCyclesMap.set(key, [...normalized, normalized[0]]);
    }
  }

  const results: CycleResult[] = [];
  let cycleCounter = 1;

  for (const cyclePath of Array.from(uniqueCyclesMap.values())) {
    results.push({
      id: `cycle_${String(cycleCounter++).padStart(3, '0')}`,
      length: cyclePath.length - 1,
      path: cyclePath,
      pathString: cyclePath.join(' → '),
    });
  }

  return results;
}
