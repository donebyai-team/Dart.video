import {Config} from '@remotion/cli/config';

Config.overrideWebpackConfig((config) => config);
Config.setEntryPoint("./src/examples/index.ts");