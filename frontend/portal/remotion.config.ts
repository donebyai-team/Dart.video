import { Config } from '@remotion/cli/config';

Config.overrideWebpackConfig((currentConfiguration) => {
  return {
    ...currentConfiguration,
    resolve: {
      ...currentConfiguration.resolve,
      alias: {
        ...(currentConfiguration.resolve?.alias || {}),
        '@': '/Users/saurabhkumar/Desktop/dbai-editor/frontend/portal/src',
      },
      modules: [
        '/Users/saurabhkumar/Desktop/dbai-editor/frontend/portal/node_modules',
        'node_modules',
      ],
    },
  };
});