<template>
  <ml-toggle-button
    v-model="isFullscreenMode"
    :data="fullScreenBtnData"
    @click="toggleFullScreen"
  />
</template>

<script lang="ts" setup>
import { useFullscreen } from '@vueuse/core'
import { Component, computed, h } from 'vue'
import { useI18n } from 'vue-i18n'

import { fullScreen } from '../../svg'
import { MlToggleButton } from '../common'

const { t } = useI18n()
const { isFullscreen, toggle: toggleFullScreen } = useFullscreen()

const FullScreenIcon: Component = {
  name: 'FullScreenIcon',
  setup() {
    return () =>
      h('img', {
        src: fullScreen,
        style: 'width: 100%; height: 100%; display: block;'
      })
  }
}

const fullScreenBtnData = computed(() => ({
  onIcon: FullScreenIcon,
  offIcon: FullScreenIcon,
  onTooltip: t('main.statusBar.fullScreen.on'),
  offTooltip: t('main.statusBar.fullScreen.off')
}))

const isFullscreenMode = computed(() => {
  return !isFullscreen.value
})
</script>
