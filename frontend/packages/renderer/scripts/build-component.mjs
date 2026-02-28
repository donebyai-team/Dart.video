import webpack from 'webpack'
import path from 'path'
import { copyFileSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Remove standalone "--" if present
const rawArgs = process.argv.slice(2).filter(arg => arg !== '--')

// Args:
// 1. templateFolder (required)
// 2. templateName (optional)
// 3. outFile (optional)
const [templateFolderArg, templateNameArg, outArg] = rawArgs

const toGlobalName = name =>
  `__COASTER_TEMPLATE__${name.replace(/[^a-zA-Z0-9_$]/g, '')}`

if (!templateFolderArg) {
  console.error(
    'Usage:\n' +
      'pnpm build:template <template-folder> [template-name] [out-file]\n\n' +
      'Examples:\n' +
      'pnpm build:template text-animation/text-cascade\n' +
      'pnpm build:template text-animation/text-cascade TextCascade\n' +
      'pnpm build:template text-animation/text-cascade TextCascade custom.js'
  )
  process.exit(1)
}

// Derive folder name (last segment)
const folderParts = templateFolderArg.split(/[\\/]/)
const lastFolderName = folderParts[folderParts.length - 1]

// Defaults
const templateName = templateNameArg ?? 'Index'
const outFile = outArg ?? `${lastFolderName}.cdn.js`
const globalName = toGlobalName(templateNameArg ?? lastFolderName)

// Entry path
const entry = path.resolve(
  __dirname,
  '..',
  'packages/templates',
  templateFolderArg,
  `${templateName}.tsx`
)

const config = {
  mode: 'production',
  target: 'web',
  entry,
  output: {
    path: path.resolve(__dirname, '../packages/build'),
    filename: outFile,
    library: {
      type: 'window',
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