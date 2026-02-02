<template>
  <el-card v-if="visible" ref="cardRef" class="ml-entity-info">
    <el-row class="ml-entity-info-text">
      <el-col :span="24">
        <el-text size="small" class="ml-entity-info-title">
          {{ info.type }}
        </el-text>
      </el-col>
    </el-row>
    <el-row class="ml-entity-info-text">
      <el-col :span="10">
        <el-text size="small">{{ t('main.entityInfo.color') }}</el-text>
      </el-col>
      <el-col :span="14">
        <el-text size="small">{{ info.color }}</el-text>
      </el-col>
    </el-row>
    <el-row class="ml-entity-info-text">
      <el-col :span="10">
        <el-text size="small">{{ t('main.entityInfo.layer') }}</el-text>
      </el-col>
      <el-col :span="14">
        <el-text size="small">{{ info.layer }}</el-text>
      </el-col>
    </el-row>
    <el-row class="ml-entity-info-text">
      <el-col :span="10">
        <el-text size="small">{{ t('main.entityInfo.lineType') }}</el-text>
      </el-col>
      <el-col :span="14">
        <el-text size="small">{{ info.lineType }}</el-text>
      </el-col>
    </el-row>
  </el-card>
</template>

<script setup lang="ts">
import {
  AcApDocManager,
  AcApSettingManager
} from '@mlightcad/cad-simple-viewer'
import { AcDbEntity } from '@mlightcad/data-model'
import { ComponentPublicInstance, computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { useHover } from '../../composable'
import { colorName, entityName } from '../../locale'

const { t } = useI18n()
const cardRef = ref<ComponentPublicInstance<{}, HTMLElement> | null>(null)
const containerRef = ref<HTMLElement | null>(null)
const { hovered, entity, mouse } = useHover()

const cardWidth = ref(180)
const cardHeight = ref(120)
const containerWidth = ref(800) // 默认值，会在 mounted 时更新
const containerHeight = ref(600) // 默认值，会在 mounted 时更新
const margin = 8

// 更新容器尺寸
const updateContainerSize = () => {
  if (containerRef.value) {
    const rect = containerRef.value.getBoundingClientRect()
    containerWidth.value = rect.width
    containerHeight.value = rect.height
  }
}

// 获取父容器尺寸
onMounted(() => {
  // 查找最近的定位父容器（.ml-cad-viewer-container）
  const findContainer = (el: HTMLElement | null): HTMLElement | null => {
    if (!el) return null
    if (el.classList.contains('ml-cad-viewer-container')) {
      return el
    }
    return findContainer(el.parentElement)
  }

  nextTick(() => {
    const cardEl = cardRef.value?.$el as HTMLElement | undefined
    if (cardEl) {
      const container = findContainer(cardEl.parentElement)
      if (container) {
        containerRef.value = container
        updateContainerSize()
        // 监听容器尺寸变化
        const resizeObserver = new ResizeObserver(updateContainerSize)
        resizeObserver.observe(container)
        
        // 存储清理函数
        ;(containerRef.value as any).__resizeObserver = resizeObserver
      }
    }
  })
})

onUnmounted(() => {
  if (containerRef.value && (containerRef.value as any).__resizeObserver) {
    ;(containerRef.value as any).__resizeObserver.disconnect()
  }
})

const left = computed(
  () =>
    `${Math.min(Math.max(mouse.value.x, margin), containerWidth.value - cardWidth.value - margin)}px`
)
const top = computed(
  () =>
    `${Math.min(Math.max(mouse.value.y, margin), containerHeight.value - cardHeight.value - margin)}px`
)

const info = computed(() => {
  const ent = entity.value as unknown as AcDbEntity | null
  if (!ent) return { type: '', color: '', layer: '', lineType: '' }

  return {
    type: entityName(ent),
    color: colorName(ent.color.toString()),
    layer: ent.layer,
    lineType: ent.lineType
  }
})

const visible = computed(
  () =>
    hovered.value &&
    info.value.type !== '' &&
    AcApSettingManager.instance.isShowEntityInfo &&
    !AcApDocManager.instance.editor.isActive
)

watch(visible, async val => {
  if (val) {
    await nextTick()
    const el = cardRef.value?.$el as HTMLElement | undefined
    if (el) {
      cardWidth.value = el.offsetWidth
      cardHeight.value = el.offsetHeight
    }
  }
})
</script>

<style scoped>
.ml-entity-info {
  position: absolute;
  left: v-bind(left);
  top: v-bind(top);
  width: 180px;
  margin: 0;
  transition: none !important;
}
.ml-entity-info-title {
  font-weight: bold;
}
.ml-entity-info-text {
  margin-bottom: 6px;
  margin-top: 6px;
}
</style>
