import * as Koa from 'koa'
import { Middleware } from 'koa'
import { controllerPoll } from './controllerDecorator'
import { koaRuntime } from '../koaRuntime'
import { ControllerMetaType } from '@kever/router'
import { logger } from '@kever/logger'
import { loadModules } from '../loadModules'

interface AppOption {
  hostname?: string
  port?: number
  plugins?: (string | Middleware)[]
  env?: string
  tsconfig?: string
}

type Instance = new (...args: any[]) => any

const DEFAULT_OPTION = {
  hostname: '127.0.0.1',
  port: 8080,
  plugins: [],
  env: 'development',
  tsconfig: 'tsconfig.json',
}

type Callback = (app: Koa) => void
export const createApp = async (options: AppOption, callback?: Callback) => {
  try {
    const processOptions = _handleOptions(options)
    let koaPlugin: Middleware[] = []
    let keverPlguin: string[] = []
    for (let i = 0; i < processOptions.plugins.length; i++) {
      const plugin = processOptions.plugins[i]
      if (typeof plugin === 'string') {
        keverPlguin.push(plugin)
      } else {
        koaPlugin.push(plugin)
      }
    }
    // loadModules
    logger.info('✅...load file...')
    await loadModules(keverPlguin, processOptions.env, processOptions.tsconfig)
    logger.info('✅...load file done...')

    const constrollers = new Set<ControllerMetaType>()

    for (let [path, constructor] of controllerPoll.entries()) {
      const controller = new (constructor as Instance)()
      constrollers.add({ path, controller })
    }

    const app = koaRuntime(constrollers, koaPlugin)

    app.on('error', (error) => {
      logger.error(error)
    })

    app.listen(processOptions.port, processOptions.hostname, () => {
      logger.info(
        `server listening http://${processOptions.hostname}:${processOptions.port}`
      )
      logger.info('server is running...')
      callback && callback(app)
    })
  } catch (err) {
    logger.error(err)
  }
}

function _handleOptions(options: AppOption = {}): Required<AppOption> {
  return Object.assign({}, DEFAULT_OPTION, options)
}
