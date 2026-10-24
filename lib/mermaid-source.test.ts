import { describe, expect, it } from 'vitest';
import { hexLuminance, readableMermaidSource } from './mermaid-source';

describe('hexLuminance', () => {
  it('reads short and long hex colors', () => {
    expect(hexLuminance('#fff')).toBeCloseTo(1);
    expect(hexLuminance('#000000')).toBe(0);
    expect(hexLuminance('red')).toBeNull();
  });
});

describe('readableMermaidSource', () => {
  it('adds a dark text color to a light fill without one', () => {
    expect(readableMermaidSource('  classDef entry fill:#e8eefd,stroke:#4c7ff2', '#111111')).toBe(
      '  classDef entry fill:#e8eefd,stroke:#4c7ff2,color:#111111'
    );
    expect(readableMermaidSource('style A fill:#fff', '#111111')).toBe(
      'style A fill:#fff,color:#111111'
    );
  });

  it('leaves dark fills, explicit colors, named colors and other lines alone', () => {
    const source = [
      'flowchart LR',
      'A["fill:#fff"] --> B',
      'classDef dark fill:#1e293b',
      'classDef chosen fill:#ffffff,color:#ff0000',
      'classDef named fill:white',
    ].join('\n');
    expect(readableMermaidSource(source, '#111111')).toBe(source);
  });
});
