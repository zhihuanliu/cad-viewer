<template>
  <div id="app-root">
    <!-- Upload screen when no file is selected -->
    <div v-if="!store.selectedFile" class="upload-screen">
      <FileUpload @file-select="handleFileSelect" />
    </div>

    <!-- CAD viewer when file is selected -->
    <div v-else class="cad-viewer-container">
      <MlCadViewer
        locale="en"
        :local-file="store.selectedFile"
        base-url="/cad-data/"
        @create="initialize"
      />
      <!-- 
      离线部署配置说明：
      1. 将字体文件下载到 public/cad-data/fonts/ 目录
      2. 设置 base-url="/cad-data/" 使用本地字体
      3. 如果使用其他路径，请相应调整 base-url
      
      在线使用示例：
      <MlCadViewer
        locale="en"
        :local-file="store.selectedFile"
        base-url="https://cdn.jsdelivr.net/gh/mlightcad/cad-data@main/"
        @create="initialize"
      />
      -->
      <AnnotationTool />
    </div>
  </div>
</template>

<script setup lang="ts">
import { AcApDocManager, AcEdCommandStack } from '@mlightcad/cad-simple-viewer'
import { MlCadViewer } from '@mlightcad/cad-viewer'

import { AcApAnnotationCmd, AcApQuitCmd } from './commands'
import AnnotationTool from './components/AnnotationTool.vue'
import FileUpload from './components/FileUpload.vue'
import { initializeLocale } from './locale'
import { store } from './store'

const initialize = () => {
  initializeLocale()
  const register = AcApDocManager.instance.commandManager
  register.addCommand(
    AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
    'quit',
    'quit',
    new AcApQuitCmd()
  )
  register.addCommand(
    AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
    'exit',
    'exit',
    new AcApQuitCmd()
  )
  register.addCommand(
    AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
    'annotation',
    'annotation',
    new AcApAnnotationCmd()
  )
}

// Decide whether to show command line vertical toolbar at the right side,
// performance stats, coordinates in status bar, etc.
// AcApSettingManager.instance.isShowCommandLine = false
// AcApSettingManager.instance.isShowToolbar = false
// AcApSettingManager.instance.isShowStats = false
// AcApSettingManager.instance.isShowCoordinate = false

// Handle file selection from upload component
const handleFileSelect = (file: File) => {
  store.selectedFile = file
}
</script>

<style scoped>
#app-root {
  height: 100vh;
  position: fixed;
}

.upload-screen {
  height: 100vh;
  width: 100vw;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  margin: 0;
  padding: 0;
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1000;
  pointer-events: auto; /* Allow clicks on upload screen */
}

.cad-viewer-container {
  position: relative;
  width: 800px;
  height: 600px;
}
</style>
