import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { Tree, readProjectConfiguration } from '@nx/devkit';

import generator from './generator';
import { QwikWorkspacePresetGeneratorSchema } from './schema';
import { Linter } from '@nx/eslint';

describe('preset generator', () => {
  let appTree: Tree;
  const options: QwikWorkspacePresetGeneratorSchema = {
    qwikAppName: 'test',
    qwikAppStyle: 'css',
    linter: Linter.None,
    e2eTestRunner: 'none',
    unitTestRunner: 'none',
  };

  beforeEach(() => {
    appTree = createTreeWithEmptyWorkspace({ layout: 'apps-libs' });
  });

  it('should run successfully', async () => {
    await generator(appTree, options);
    const config = readProjectConfiguration(appTree, 'test');
    expect(config).toBeDefined();
  });
});
