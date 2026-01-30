import 'element-plus/dist/index.css'
import '../style/style.css'
import '../style/index.scss'

import {
  AcApDocManager,
  AcApDocManagerOptions
} from '@mlightcad/cad-simple-viewer'

import { registerCmds, registerDialogs } from './register'

export const initializeCadViewer = (
  options: AcApDocManagerOptions = {},
  docManager?: AcApDocManager
) => {
  const manager = docManager || AcApDocManager.createInstance(options)
  registerCmds(manager)
  registerDialogs(manager)
  return manager
}
