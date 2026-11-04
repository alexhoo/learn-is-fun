import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const DOCS = join(__dirname, '..', '..', 'docs', 'curriculum');

describe('base de conocimiento del currículo', () => {
  it('tiene el índice, la escalera y las reglas de complejidad', () => {
    for (const file of ['README.md', 'STAGES.md', 'COMPLEXITY.md']) {
      assert.ok(existsSync(join(DOCS, file)), file);
    }
  });

  it('hay un archivo de tema por mundo, y cada uno declara su mundo en la primera línea', () => {
    const files = readdirSync(join(DOCS, 'themes')).filter((f) => f.endsWith('.md') && f !== '_template.md');
    assert.equal(files.length, 4);
    const worlds = files.map((f) => {
      const first = readFileSync(join(DOCS, 'themes', f), 'utf8').split('\n')[0];
      const match = /^world: (farm|rainbow|space|city)$/.exec(first);
      assert.ok(match, `${f}: primera línea "${first}"`);
      return match[1];
    });
    assert.equal(new Set(worlds).size, 4);
  });
});
