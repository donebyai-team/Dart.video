import webpack from 'webpack'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const config = {
  mode: 'production',
  entry: path.resolve(__dirname, '../packages/templates/text-cascade/TextCascade.tsx'),
  output: {
    path: path.resolve(__dirname, '../packages/build'),
    filename: 'TextCascade.mjs',
    library: {
      type: 'module'
    },
    clean: false
  },
  experiments: {
    outputModule: true
  },
  externals: {
    react: 'react',
    'react-dom': 'react-dom',
    'react/jsx-runtime': 'react/jsx-runtime',
    remotion: 'remotion'
  },
  externalsType: 'module',
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.jsx'],
    alias: {
      '@': path.resolve(__dirname, '../portal/src')
    }
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'swc-loader',
          options: {
            jsc: {
              parser: {
                syntax: 'typescript',
                tsx: true
              },
              transform: {
                react: {
                  runtime: 'automatic'
                }
              }
            }
          }
        }
      }
    ]
  }
}

webpack(config, (err, stats) => {
  if (err || stats.hasErrors()) {
    console.error(err || stats.toString())
    process.exit(1)
  }
  console.log('✅ Component built successfully!')
  console.log(stats.toString({ colors: true, minimal: true }))
})
