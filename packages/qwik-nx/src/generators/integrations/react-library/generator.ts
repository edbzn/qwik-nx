import {
  formatFiles,
  generateFiles,
  GeneratorCallback,
  joinPathFragments,
  output,
  readProjectConfiguration,
  Tree,
  runTasksInSerial,
} from '@nx/devkit';
import * as path from 'path';
import { ReactLibraryGeneratorSchema } from './schema';
import { normalizeOptions as libraryNormalizeOptions } from './../../library/utils/normalize-options';
import libraryGenerator from '../../library/generator';
import {
  addReactPluginToViteConfig,
  reactInit,
} from '../../../utils/react/init';

interface NormalizedSchema extends ReactLibraryGeneratorSchema {
  name: string;
  installMUIExample: boolean;
  targetApps: string[];
  projectName: string;
  projectRoot: string;
  parsedTags: string[];
}

async function normalizeOptions(
  tree: Tree,
  options: ReactLibraryGeneratorSchema
): Promise<NormalizedSchema> {
  const normalizedLibraryOptions = await libraryNormalizeOptions(tree, {
    ...options,
    style: 'none',
  });

  let targetApps: string[] = [];
  if (Array.isArray(options.targetApps)) {
    targetApps = options.targetApps.filter(Boolean);
  } else if (
    typeof options.targetApps === 'string' &&
    options.targetApps.trim()
  ) {
    // can be of type "string" if value comes from the x-prompt
    targetApps = options.targetApps
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
  }

  return {
    ...normalizedLibraryOptions,
    installMUIExample: options.installMUIExample !== false,
    targetApps,
  };
}

function addFiles(tree: Tree, options: NormalizedSchema) {
  generateFiles(
    tree,
    path.join(__dirname, 'files'),
    options.projectRoot,
    options
  );
}

function updateTargetApps(tree: Tree, targetApps: string[]) {
  if (!targetApps?.length) {
    output.warn({
      title: `You haven't provided any "targetApps" to be configured.`,
      bodyLines: [
        'Qwik React integration requires "qwikReact()" plugin to be included for all apps where qwikified react components are used.',
        'You can still import the plugin manually.',
      ],
    });
  } else {
    for (const targetApp of new Set(targetApps)) {
      const config = readProjectConfiguration(tree, targetApp);
      if (config.projectType !== 'application') {
        throw new Error(`"${targetApp}" project is not an application`);
      }
      addReactPluginToViteConfig(tree, config.root);
    }
  }
}

export async function reactLibraryGenerator(
  tree: Tree,
  schema: ReactLibraryGeneratorSchema
) {
  const normalizedOptions = await normalizeOptions(tree, schema);
  const tasks: GeneratorCallback[] = [];

  const installTask = await libraryGenerator(tree, {
    ...normalizedOptions,
    skipFormat: true,
    generateComponent: false,
  });
  tasks.push(installTask);

  const initTask = reactInit(tree, {
    demoFilePath: joinPathFragments(
      normalizedOptions.projectRoot,
      'src/lib/integration'
    ),
    installMUIExample: !!normalizedOptions.installMUIExample,
    projectRoot: normalizedOptions.projectRoot,
  });
  tasks.push(initTask);

  addFiles(tree, normalizedOptions);

  updateTargetApps(tree, normalizedOptions.targetApps);

  if (!normalizedOptions.skipFormat) {
    await formatFiles(tree);
  }

  return runTasksInSerial(...tasks);
}

export default reactLibraryGenerator;
