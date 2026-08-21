import { describe, it, expect } from 'vitest';
import { runRepositoryAnalysisPipeline } from '../../lib/github/analysis-pipeline';

describe('Analysis Pipeline Integration Test', () => {
  it('runs complete analysis on demo repository and builds graph', async () => {
    const result = await runRepositoryAnalysisPipeline(
      'nodeatlas-org',
      'ecommerce-microservices-demo',
      'main'
    );

    expect(result.filesScanned).toBeGreaterThan(10);
    expect(result.dependenciesFound).toBeGreaterThan(10);
    expect(result.cyclesFound).toBeGreaterThan(0);
    expect(result.cycles.length).toBeGreaterThanOrEqual(3);
  });
});
