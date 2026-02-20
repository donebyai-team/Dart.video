import webpack from 'webpack'
import path from 'path'
import { copyFileSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const rawArgs = process.argv.slice(2).filter(arg => arg !== '--')
const [templateFolderArg, templateNameArg, outArg] = rawArgs
const toGlobalName = name => `__COASTER_TEMPLATE__${name.replace(/[^a-zA-Z0-9_$]/g, '')}`

if (!templateFolderArg || !templateNameArg) {
  console.error(
    'Usage: pnpm build:template -- <template-folder> <template-name> [out-file]\nExample: pnpm build:template -- text-animation/text-cascade TextCascade'
  )
  process.exit(1)
}

const entry = path.resolve(
  __dirname,
  '..',
  'packages/templates',
  templateFolderArg,
  `${templateNameArg}.tsx`
)
const outFile = outArg ?? `${templateNameArg}.cdn.js`
const globalName = toGlobalName(templateNameArg)

const config = {
  mode: 'production',
  target: 'web',
  entry,
  output: {
    path: path.resolve(__dirname, '../packages/build'),
    // Upload this file to your CDN.
    filename: outFile,
    library: {
      type: 'window',
      // The runtime loader reads this window key after loading script.
      name: globalName
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

  const builtFile = path.resolve(__dirname, '../packages/build', outFile)
  const localTemplatesDir = path.resolve(__dirname, '../portal/public/templates')
  const localFile = path.resolve(localTemplatesDir, outFile)

  mkdirSync(localTemplatesDir, { recursive: true })
  copyFileSync(builtFile, localFile)

  console.log(`Built CDN template file: packages/build/${outFile}`)
  console.log(`Copied local test file: portal/public/templates/${outFile}`)
  console.log(`Expose key: window.${globalName}`)
  console.log(stats?.toString({ colors: true, minimal: true }))
})
