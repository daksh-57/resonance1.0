/** Practical Phase-4 model: logistic regression on match/reconcile features. */

export type FeedbackRow = {
  features: number[];
  label: number;
};

export type TrainedModel = {
  version: string;
  weights: number[];
  bias: number;
  trainedAt: string;
  trainingRecords: number;
  accuracy: number;
};

function sigmoid(z: number): number {
  if (z > 20) return 1;
  if (z < -20) return 0;
  return 1 / (1 + Math.exp(-z));
}

export function trainLogistic(rows: FeedbackRow[], learningRate = 0.15, epochs = 250): TrainedModel | null {
  if (rows.length < 20) return null;
  const dim = rows[0]?.features.length ?? 0;
  if (!dim) return null;
  const weights = new Array(dim).fill(0);
  let bias = 0;
  for (let e = 0; e < epochs; e++) {
    const gW = new Array(dim).fill(0);
    let gB = 0;
    for (const row of rows) {
      const z = bias + row.features.reduce((s, x, i) => s + x * weights[i]!, 0);
      const err = sigmoid(z) - row.label;
      for (let i = 0; i < dim; i++) gW[i] += err * row.features[i]!;
      gB += err;
    }
    const n = rows.length;
    for (let i = 0; i < dim; i++) weights[i] -= (learningRate * gW[i]!) / n;
    bias -= (learningRate * gB) / n;
  }
  let correct = 0;
  for (const row of rows) {
    const z = bias + row.features.reduce((s, x, i) => s + x * weights[i]!, 0);
    const pred = sigmoid(z) >= 0.5 ? 1 : 0;
    if (pred === row.label) correct++;
  }
  return {
    version: `lr-${rows.length}-${Date.now()}`,
    weights,
    bias,
    trainedAt: new Date().toISOString(),
    trainingRecords: rows.length,
    accuracy: correct / rows.length,
  };
}

export function predictProba(model: TrainedModel, features: number[]): number {
  const z = model.bias + features.reduce((s, x, i) => s + x * (model.weights[i] ?? 0), 0);
  return 1 / (1 + Math.exp(-z));
}

export function matchFeatures(fieldScores: Record<string, number>): number[] {
  return [
    fieldScores.name ?? 0,
    fieldScores.email ?? 0,
    fieldScores.phone ?? 0,
    fieldScores.address ?? 0,
    fieldScores.date_of_birth ?? 0,
    fieldScores.customer_id ?? 0,
  ];
}
