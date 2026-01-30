import { AcApDocManager, AcEdCommandStack } from '@mlightcad/cad-simple-viewer'
import { markRaw } from 'vue'

import {
  AcApLayerStateCmd,
  AcApMissedDataCmd,
  AcApPointStyleCmd
} from '../command'
import { MlPointStyleDlg, MlReplacementDlg } from '../component'
import { useDialogManager } from '../composable'

// Track registered instances to avoid duplicate registration
// Use separate Sets for commands and dialogs to allow independent registration
const registeredCommands = new Set<AcApDocManager>()
const registeredDialogs = new Set<AcApDocManager>()

export const registerCmds = (docManager?: AcApDocManager) => {
  const manager = docManager || AcApDocManager.instance
  
  // Skip if already registered for this instance
  if (registeredCommands.has(manager)) {
    return
  }
  
  const register = manager.commandManager
  register.addCommand(
    AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
    'la',
    'la',
    new AcApLayerStateCmd()
  )
  register.addCommand(
    AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
    'md',
    'md',
    new AcApMissedDataCmd()
  )
  register.addCommand(
    AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
    'pttype',
    'pttype',
    new AcApPointStyleCmd()
  )
  
  registeredCommands.add(manager)
}

export const registerDialogs = (docManager?: AcApDocManager) => {
  const manager = docManager || AcApDocManager.instance
  
  // Skip if already registered for this instance
  if (registeredDialogs.has(manager)) {
    return
  }
  
  const { registerDialog } = useDialogManager()
  registerDialog({
    name: 'ReplacementDlg',
    component: markRaw(MlReplacementDlg),
    props: {}
  })
  registerDialog({
    name: 'PointStyleDlg',
    component: markRaw(MlPointStyleDlg),
    props: {}
  })
  
  registeredDialogs.add(manager)
}
