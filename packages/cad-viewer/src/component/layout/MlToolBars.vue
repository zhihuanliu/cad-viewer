<script setup lang="ts">
import { AcApDocManager } from '@mlightcad/cad-simple-viewer'
import { MlToolBar } from '@mlightcad/ui-components'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { useSettings } from '../../composable'
import {
  annotation,
  layer,
  machine,
  move,
  removeAll,
  select,
  zoomToBox,
  zoomToExtent
} from '../../svg'

const { t } = useI18n()
const features = useSettings()

// 跟踪是否有标注
const hasAnnotations = ref(false)
// 是否显示机器人
const isRobotVisible = ref(true)

const verticalToolbarData = computed(() => [
  {
    icon: select,
    text: t('main.verticalToolbar.select.text'),
    command: 'select',
    description: t('main.verticalToolbar.select.description'),
    disabled: false
  },
  {
    icon: move,
    text: t('main.verticalToolbar.pan.text'),
    command: 'pan',
    description: t('main.verticalToolbar.pan.description'),
    disabled: false
  },
  {
    icon: zoomToExtent,
    text: t('main.verticalToolbar.zoomToExtent.text'),
    command: 'zoom',
    description: t('main.verticalToolbar.zoomToExtent.description'),
    disabled: false
  },
  {
    icon: zoomToBox,
    text: t('main.verticalToolbar.zoomToBox.text'),
    command: 'zoomw',
    description: t('main.verticalToolbar.zoomToBox.description'),
    disabled: false
  },
  {
    icon: layer,
    text: t('main.verticalToolbar.layer.text'),
    command: 'la',
    description: t('main.verticalToolbar.layer.description'),
    disabled: false
  },
  {
    icon: annotation,
    text: t('main.verticalToolbar.annotation.text'),
    command: 'annotation',
    description: t('main.verticalToolbar.annotation.description'),
    disabled: false
  },
  {
    icon: removeAll,
    text: t('main.verticalToolbar.clearAnnotation.text'),
    command: 'clearAnnotation',
    description: t('main.verticalToolbar.clearAnnotation.description'),
    disabled: !hasAnnotations.value
  },
  {
    // 机器人显示/隐藏切换按钮
    icon: machine,
    text: isRobotVisible.value
      ? t('main.verticalToolbar.robot.hide')
      : t('main.verticalToolbar.robot.show'),
    command: 'toggleRobot',
    description: t('main.verticalToolbar.robot.description'),
    disabled: false
  }
])

const handleCommand = (command: string) => {
  if (command === 'clearAnnotation') {
    // 如果没有标注，不执行操作
    if (!hasAnnotations.value) {
      return
    }
    // 通过 window 自定义事件触发清空标注
    window.dispatchEvent(new CustomEvent('clear-all-annotations'))
  } else if (command === 'toggleRobot') {
    // 切换机器人显示状态并通过自定义事件派发给外部
    isRobotVisible.value = !isRobotVisible.value
    window.dispatchEvent(
      new CustomEvent('cad-viewer:toggle-robot', {
        detail: {
          visible: isRobotVisible.value
        }
      })
    )
  } else {
    AcApDocManager.instance.sendStringToExecute(command)
  }
}

// 监听标注状态变化
const handleAnnotationCountChange = (event: CustomEvent) => {
  hasAnnotations.value = event.detail.count > 0
}

onMounted(() => {
  window.addEventListener('annotation-count-changed', handleAnnotationCountChange as EventListener)
})

onUnmounted(() => {
  window.removeEventListener('annotation-count-changed', handleAnnotationCountChange as EventListener)
})
</script>

<template>
  <div v-if="features.isShowToolbar" class="ml-vertical-toolbar-container">
    <ml-tool-bar :items="verticalToolbarData" size="small" direction="vertical" @click="handleCommand" />
  </div>
</template>

<style>
.ml-vertical-toolbar-container {
  position: absolute;
  right: 30px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 1000;
  pointer-events: auto !important;
  isolation: isolate;
}

/* 确保工具栏内部所有元素都可以交互 */
.ml-vertical-toolbar-container * {
  pointer-events: auto;
}
</style>
