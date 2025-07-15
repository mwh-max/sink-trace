// flowSimulator.js
// Simulates pressure drop and directional flow logic for SinkTrace.

const pressureHistory = {};

export function simulateFlow(topology, previousState = {}) {
  const updatedNodes = {};

  topology.pipes.forEach(pipe => {
    const fromNode = topology.nodes.find(n => n.id === pipe.from);
    const toNode = topology.nodes.find(n => n.id === pipe.to);

    const pressureDrop = calculatePressureDrop(pipe.length, pipe.diameter);
    const newPressure = Math.max(fromNode.pressure - pressureDrop, 0);

    const previousPressure = previousState[toNode.id]?.pressure ?? toNode.pressure;
    const reversedFlow = newPressure < previousPressure;

    updatedNodes[toNode.id] = {
      ...toNode,
      pressure: newPressure,
      flowDirection: reversedFlow ? "reversed" : "normal"
    };

    if (!pressureHistory[toNode.id]) pressureHistory[toNode.id] = [];
    pressureHistory[toNode.id].push(newPressure);
  });

  return {
    updatedNodes,
    pressureHistory
  };
}

function calculatePressureDrop(length, diameter) {
  return parseFloat(((length / diameter) * 0.1).toFixed(2));
}