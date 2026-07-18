import type {
  IntelligenceAgentProfile,
  IntelligenceAgentRun,
  IntelligenceBoundary,
  IntelligenceGraphEdge,
  IntelligenceGraphNode,
  IntelligenceLearnedPattern,
  IntelligenceReport,
  IntelligenceRiskAssessment,
  IntelligenceShadowOutput,
  IntelligenceShadowRule,
} from "./types";

export interface PersistedIntelligenceState {
  schemaVersion: 2;
  updatedAt: string;
  runSequence: number;
  boundary: IntelligenceBoundary;
  agents: IntelligenceAgentProfile[];
  reports: IntelligenceReport[];
  graph: {
    nodes: IntelligenceGraphNode[];
    edges: IntelligenceGraphEdge[];
  };
  patterns: IntelligenceLearnedPattern[];
  shadowRules: IntelligenceShadowRule[];
  riskAssessments: IntelligenceRiskAssessment[];
  shadowOutput: IntelligenceShadowOutput;
  agentRuns: IntelligenceAgentRun[];
}
