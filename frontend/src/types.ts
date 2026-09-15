export interface Metrics {
  instructions:   number;
  basic_blocks:   number;
  functions:      number;
  loops:          number;
  max_loop_depth: number;
  branches:       number;
  loads:          number;
  stores:         number;
  arithmetic:     number;
  calls:          number;
  comparisons:    number;
}

export interface Strategy {
  name:      string;
  passes:    string[];
  reasoning: string[];
  score:     number;
}

export interface BenchmarkEntry {
  strategy:     string;
  flags:        string;
  compile_time: number;
  exec_time:    number;
  binary_size:  number;
  output?:      string;
  error?:       string;
}

export interface ApexResult {
  filename:   string;
  metrics:    Metrics;
  features:   Record<string, number>;
  strategy:   Strategy;
  benchmark:  BenchmarkEntry[];
  ir_snippet: string;
}
