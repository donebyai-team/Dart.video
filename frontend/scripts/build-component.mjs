import webpack from 'webpack'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Simple one-template build. You can duplicate this config per template.
const entry = path.resolve(
  __dirname,
  '../packages/templates/text-animation/text-cascade/TextCascade.tsx'
)

const config = {
  mode: 'production',
  target: 'web',
  entry,
  output: {
    path: path.resolve(__dirname, '../packages/build'),
    // Upload this file to your CDN.
    filename: 'TextCascade.cdn.js',
    library: {
      type: 'window',
      // The runtime loader reads this window key after loading script.
      name: '__COASTER_TEMPLATE__TextCascade'
    },
    clean: false
  },
  externalsType: 'window',
  externals: {
    react: 'React',
    'react-dom': 'ReactDOM',
    'react/jsx-runtime': 'ReactJSXRuntime',
    remotion: 'Remotion'
  },
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
  if (err || stats?.hasErrors()) {
    console.error(err || stats?.toString({ colors: true }))
    process.exit(1)
  }

  console.log('Built CDN template file: packages/build/TextCascade.cdn.js')
  console.log('Expose key: window.__COASTER_TEMPLATE__TextCascade')
  console.log(stats?.toString({ colors: true, minimal: true }))
})
