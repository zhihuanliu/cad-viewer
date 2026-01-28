<template>
  <div class="annotation-tool">

    <!-- 标注选项下拉菜单（点击矩形框时显示在矩形框附近） -->
    <div
      v-if="showDropdown && currentAnnotationId"
      class="annotation-dropdown-container"
      :style="dropdownStyle"
      @click.stop
    >
      <el-select
        v-model="selectedAnnotationType"
        placeholder="请选择标注类型"
        style="width: 200px"
        @change="onDropdownChange"
        @visible-change="onDropdownVisibleChange"
        ref="dropdownSelect"
      >
        <el-option
          v-for="option in annotationOptions"
          :key="option.value"
          :label="option.label"
          :value="option.value"
        />
      </el-select>
    </div>

    <!-- SVG overlay用于绘制矩形框 -->
    <svg
      v-if="canvasContainer"
      ref="svgOverlay"
      class="annotation-overlay"
      :class="{ 'drawing-mode': isDrawing }"
      :style="overlayStyle"
      @mousedown="onMouseDown"
      @mousemove="onMouseMove"
      @mouseup="onMouseUp"
      @click="onSvgClick"
    >
      <!-- 绘制中的矩形 -->
      <rect
        v-if="isDrawing && currentRect"
        :x="currentRect.x"
        :y="currentRect.y"
        :width="currentRect.width"
        :height="currentRect.height"
        class="drawing-rect"
        fill="none"
        stroke="#409eff"
        stroke-width="2"
        stroke-dasharray="5,5"
      />

      <!-- 已完成的标注矩形 -->
      <g
        v-for="annotation in annotations"
        :key="annotation.id"
        @click.stop="onAnnotationClick(annotation, $event)"
      >
        <rect
          v-if="annotation.screenCoordinates"
          :x="annotation.screenCoordinates.x"
          :y="annotation.screenCoordinates.y"
          :width="annotation.screenCoordinates.width"
          :height="annotation.screenCoordinates.height"
          class="annotation-rect"
          :class="{ 'selected': selectedAnnotationId === annotation.id }"
          fill="rgba(64, 158, 255, 0.1)"
          stroke="#409eff"
          stroke-width="2"
        />
        <!-- 标注类型标签 -->
        <text
          v-if="annotation.annotationType && annotation.screenCoordinates"
          :x="annotation.screenCoordinates.x + 5"
          :y="annotation.screenCoordinates.y + 20"
          class="annotation-label"
          fill="#409eff"
          font-size="12"
        >
          {{ getAnnotationLabel(annotation.annotationType) }}
        </text>
      </g>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { AcApDocManager } from '@mlightcad/cad-simple-viewer'
import { logger } from '../utils/logger'
import { submitAnnotation, type AnnotationData } from '../services/annotationApi'

interface Rect {
  x: number
  y: number
  width: number
  height: number
}

interface WorldRect {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

interface Annotation extends AnnotationData {
  id: string
  // 屏幕坐标（用于显示，会根据视图变化重新计算）
  screenCoordinates?: Rect
}

// Props
defineProps<{
  enabled?: boolean
}>()

// 标注选项
const annotationOptions = [
  { label: '缺陷', value: 'defect' },
  { label: '异常', value: 'abnormal' },
  { label: '需要检查', value: 'need_check' },
  { label: '已完成', value: 'completed' },
  { label: '其他', value: 'other' }
]

// 状态
const isDrawing = ref(false)
const annotations = ref<Annotation[]>([])
const selectedAnnotationId = ref<string | null>(null)
const showDropdown = ref(false)
const selectedAnnotationType = ref('')
const currentAnnotationId = ref<string | null>(null)
const dropdownPosition = ref<{ x: number; y: number } | null>(null)
const dropdownSelect = ref<any>(null)

// 绘制相关
const startPoint = ref<{ x: number; y: number } | null>(null)
const currentRect = ref<Rect | null>(null)
const svgOverlay = ref<SVGSVGElement | null>(null)
const canvasContainer = ref<HTMLElement | null>(null)
const currentView = ref<any>(null) // AcEdBaseView 实例

// 计算overlay样式
const overlayStyle = computed(() => {
  if (!canvasContainer.value) return {}
  const rect = canvasContainer.value.getBoundingClientRect()
  return {
    position: 'absolute' as const,
    top: '0',
    left: '0',
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    zIndex: 1000
  }
})

// 计算下拉菜单样式
const dropdownStyle = computed(() => {
  if (!dropdownPosition.value || !canvasContainer.value) return {}
  return {
    position: 'absolute' as const,
    left: `${dropdownPosition.value.x}px`,
    top: `${dropdownPosition.value.y}px`,
    zIndex: 1002
  }
})

// 获取标注类型标签
const getAnnotationLabel = (value: string) => {
  const option = annotationOptions.find(opt => opt.value === value)
  return option ? option.label : value
}

// 切换绘制模式
const toggleDrawingMode = () => {
  isDrawing.value = !isDrawing.value
  if (isDrawing.value) {
    logger.info('进入标注绘制模式', { timestamp: new Date().toISOString() })
    selectedAnnotationId.value = null
    hideDropdown()
  } else {
    logger.info('退出标注绘制模式', { timestamp: new Date().toISOString() })
    startPoint.value = null
    currentRect.value = null
    hideDropdown()
  }
}

// 鼠标按下
const onMouseDown = (event: MouseEvent) => {
  if (!isDrawing.value) return
  
  const rect = svgOverlay.value?.getBoundingClientRect()
  if (!rect) return

  startPoint.value = {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  }
  
  logger.debug('开始绘制矩形', { 
    startPoint: startPoint.value,
    timestamp: new Date().toISOString(),
    drawingMode: true
  })
}

// 鼠标移动
const onMouseMove = (event: MouseEvent) => {
  if (!isDrawing.value || !startPoint.value) return

  const rect = svgOverlay.value?.getBoundingClientRect()
  if (!rect) return

  const currentX = event.clientX - rect.left
  const currentY = event.clientY - rect.top

  currentRect.value = {
    x: Math.min(startPoint.value.x, currentX),
    y: Math.min(startPoint.value.y, currentY),
    width: Math.abs(currentX - startPoint.value.x),
    height: Math.abs(currentY - startPoint.value.y)
  }
}

// 鼠标抬起
const onMouseUp = (event: MouseEvent) => {
  if (!isDrawing.value || !startPoint.value) return

  const rect = svgOverlay.value?.getBoundingClientRect()
  if (!rect) return

  const endX = event.clientX - rect.left
  const endY = event.clientY - rect.top

  // 检查矩形是否足够大（避免误操作）
  const width = Math.abs(endX - startPoint.value.x)
  const height = Math.abs(endY - startPoint.value.y)

  if (width < 10 || height < 10) {
    logger.warn('矩形框太小，取消绘制', { 
      width, 
      height,
      timestamp: new Date().toISOString(),
      reason: '矩形尺寸小于最小阈值(10px)'
    })
    startPoint.value = null
    currentRect.value = null
    return
  }

  // 创建新的标注（屏幕坐标）
  const screenRect: Rect = {
    x: Math.min(startPoint.value.x, endX),
    y: Math.min(startPoint.value.y, endY),
    width: width,
    height: height
  }

  // 将屏幕坐标转换为世界坐标
  if (!currentView.value) {
    logger.error('无法获取视图实例，无法转换坐标', { timestamp: new Date().toISOString() })
    startPoint.value = null
    currentRect.value = null
    return
  }

  // 将屏幕坐标转换为世界坐标
  const minWorldPoint = currentView.value.screenToWorld({
    x: screenRect.x,
    y: screenRect.y
  })
  const maxWorldPoint = currentView.value.screenToWorld({
    x: screenRect.x + screenRect.width,
    y: screenRect.y + screenRect.height
  })

  // 确保 min < max
  const worldRect: WorldRect = {
    minX: Math.min(minWorldPoint.x, maxWorldPoint.x),
    minY: Math.min(minWorldPoint.y, maxWorldPoint.y),
    maxX: Math.max(minWorldPoint.x, maxWorldPoint.x),
    maxY: Math.max(minWorldPoint.y, maxWorldPoint.y)
  }

  // 生成唯一ID
  const id = `annotation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  currentAnnotationId.value = id

  // 保存标注（存储世界坐标，屏幕坐标用于显示）
  const tempAnnotation: Annotation = {
    id,
    coordinates: worldRect,
    annotationType: '',
    screenCoordinates: screenRect // 初始屏幕坐标
  }
  annotations.value.push(tempAnnotation)
  selectedAnnotationId.value = id

  logger.info('矩形框绘制完成', { 
    id, 
    worldCoordinates: worldRect,
    screenCoordinates: screenRect,
    timestamp: new Date().toISOString(),
    totalAnnotations: annotations.value.length
  })

  // 显示下拉选项（在矩形框附近）
  showDropdownForAnnotation(id, screenRect)

  // 重置绘制状态
  startPoint.value = null
  currentRect.value = null
  isDrawing.value = false
}

// SVG点击事件（用于点击已存在的标注）
const onSvgClick = (event: MouseEvent) => {
  // 如果点击的是空白区域，取消选择
  if (event.target === svgOverlay.value) {
    logger.debug('点击空白区域，取消选择', { timestamp: new Date().toISOString() })
    selectedAnnotationId.value = null
    hideDropdown()
  }
}

// 点击标注矩形
const onAnnotationClick = (annotation: Annotation, event: MouseEvent) => {
  logger.info('点击标注矩形', { 
    id: annotation.id, 
    hasType: !!annotation.annotationType,
    type: annotation.annotationType,
    worldCoordinates: annotation.coordinates,
    screenCoordinates: annotation.screenCoordinates,
    timestamp: new Date().toISOString()
  })
  
  if (!annotation.annotationType) {
    // 如果还没有选择类型，显示下拉选项
    const screenCoords = annotation.screenCoordinates || {
      x: 0,
      y: 0,
      width: 0,
      height: 0
    }
    showDropdownForAnnotation(annotation.id, screenCoords, event)
  } else {
    // 如果已经有类型，显示信息或允许编辑
    selectedAnnotationId.value = annotation.id
    logger.debug('显示已有标注信息', { 
      id: annotation.id,
      type: annotation.annotationType,
      label: getAnnotationLabel(annotation.annotationType)
    })
    ElMessage.info(`标注类型: ${getAnnotationLabel(annotation.annotationType)}`)
  }
}

// 显示下拉选项
const showDropdownForAnnotation = (
  annotationId: string, 
  screenCoordinates: Rect, 
  event?: MouseEvent
) => {
  currentAnnotationId.value = annotationId
  selectedAnnotationId.value = annotationId
  selectedAnnotationType.value = ''
  
  // 计算下拉菜单位置（在矩形框右上角或点击位置）
  if (event && svgOverlay.value) {
    const rect = svgOverlay.value.getBoundingClientRect()
    dropdownPosition.value = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top - 40 // 在点击位置上方显示
    }
  } else {
    // 默认显示在矩形框右上角
    dropdownPosition.value = {
      x: screenCoordinates.x + screenCoordinates.width + 10,
      y: screenCoordinates.y
    }
  }
  
  showDropdown.value = true
  
  logger.info('显示标注类型下拉选项', {
    annotationId,
    position: dropdownPosition.value,
    timestamp: new Date().toISOString()
  })
  
  // 自动聚焦下拉框
  nextTick(() => {
    if (dropdownSelect.value) {
      dropdownSelect.value.focus()
    }
  })
}

// 隐藏下拉选项
const hideDropdown = () => {
  if (showDropdown.value) {
    logger.debug('隐藏标注类型下拉选项', { 
      annotationId: currentAnnotationId.value,
      timestamp: new Date().toISOString()
    })
  }
  showDropdown.value = false
  dropdownPosition.value = null
}

// 下拉选项变化
const onDropdownChange = async (value: string) => {
  if (!value) return
  
  logger.info('用户在下拉框中选择标注类型', {
    annotationId: currentAnnotationId.value,
    selectedType: value,
    timestamp: new Date().toISOString()
  })
  
  await confirmAnnotation()
}

// 下拉框可见性变化
const onDropdownVisibleChange = (visible: boolean) => {
  if (!visible && showDropdown.value) {
    // 下拉框关闭时，如果没有选择类型，取消标注
    if (!selectedAnnotationType.value && currentAnnotationId.value) {
      logger.debug('下拉框关闭且未选择类型，准备取消标注', {
        annotationId: currentAnnotationId.value
      })
      cancelAnnotation()
    }
  }
}

// 确认标注
const confirmAnnotation = async () => {
  if (!currentAnnotationId.value || !selectedAnnotationType.value) {
    logger.warn('确认标注时缺少必要信息', {
      annotationId: currentAnnotationId.value,
      selectedType: selectedAnnotationType.value,
      timestamp: new Date().toISOString()
    })
    ElMessage.warning('请选择标注类型')
    return
  }

  const annotation = annotations.value.find(a => a.id === currentAnnotationId.value)
  if (!annotation) {
    logger.error('找不到对应的标注', { 
      id: currentAnnotationId.value,
      totalAnnotations: annotations.value.length,
      timestamp: new Date().toISOString()
    })
    ElMessage.error('标注数据异常，请重试')
    return
  }

  const previousType = annotation.annotationType
  annotation.annotationType = selectedAnnotationType.value

  logger.info('用户确认标注类型', {
    id: annotation.id,
    previousType: previousType || '未设置',
    newType: selectedAnnotationType.value,
    coordinates: annotation.coordinates,
    timestamp: new Date().toISOString()
  })

  try {
    logger.info('开始发送标注数据到后端', {
      id: annotation.id,
      type: selectedAnnotationType.value,
      coordinates: annotation.coordinates
    })
    
    // 发送到后端
    await submitAnnotation({
      coordinates: annotation.coordinates,
      annotationType: selectedAnnotationType.value,
      id: annotation.id
    })

    logger.info('标注数据发送成功', {
      id: annotation.id,
      type: selectedAnnotationType.value,
      timestamp: new Date().toISOString()
    })

    ElMessage.success('标注已保存')
    hideDropdown()
    currentAnnotationId.value = null
  } catch (error) {
    logger.error('保存标注失败', { 
      error: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
      annotation: {
        id: annotation.id,
        type: selectedAnnotationType.value,
        coordinates: annotation.coordinates
      },
      timestamp: new Date().toISOString()
    })
    ElMessage.error('保存标注失败，请重试')
    // 恢复之前的类型（如果有）
    if (previousType) {
      annotation.annotationType = previousType
    }
  }
}

// 取消标注
const cancelAnnotation = () => {
  if (currentAnnotationId.value) {
    // 如果还没有选择类型，删除这个标注
    const index = annotations.value.findIndex(a => a.id === currentAnnotationId.value)
    if (index !== -1 && !annotations.value[index].annotationType) {
      const deletedAnnotation = annotations.value[index]
      annotations.value.splice(index, 1)
      logger.info('取消标注，已删除矩形框', { 
        id: currentAnnotationId.value,
        coordinates: deletedAnnotation.coordinates,
        timestamp: new Date().toISOString()
      })
    } else {
      logger.debug('取消标注操作，但保留已设置类型的标注', {
        id: currentAnnotationId.value,
        hasType: index !== -1 && annotations.value[index].annotationType
      })
    }
  }
  hideDropdown()
  currentAnnotationId.value = null
  selectedAnnotationId.value = null
}

// 清空所有标注
const clearAllAnnotations = async () => {
  try {
    const count = annotations.value.length
    await ElMessageBox.confirm('确定要清空所有标注吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    logger.info('清空所有标注', {
      previousCount: count,
      timestamp: new Date().toISOString()
    })

    annotations.value = []
    selectedAnnotationId.value = null
    hideDropdown()
    
    // 通知工具栏标注数量变化
    notifyAnnotationCountChanged()
    
    logger.info('所有标注已清空', { timestamp: new Date().toISOString() })
    ElMessage.success('已清空所有标注')
  } catch {
    // 用户取消
    logger.debug('用户取消清空标注操作', { timestamp: new Date().toISOString() })
  }
}

// 通知工具栏标注数量变化
const notifyAnnotationCountChanged = () => {
  window.dispatchEvent(
    new CustomEvent('annotation-count-changed', {
      detail: { count: annotations.value.length }
    })
  )
}

// 将世界坐标转换为屏幕坐标
const worldToScreen = (worldRect: WorldRect): Rect | null => {
  // console.log('worldToScreen', worldRect)
  if (!currentView.value) {
    return null
  }
  
  try {
    // 将世界坐标的四个角点转换为屏幕坐标
    const minScreen = currentView.value.worldToScreen({
      x: worldRect.minX,
      y: worldRect.minY
    })
    const maxScreen = currentView.value.worldToScreen({
      x: worldRect.maxX,
      y: worldRect.maxY
    })
    
    // 计算屏幕矩形
    const screenRect: Rect = {
      x: Math.min(minScreen.x, maxScreen.x),
      y: Math.min(minScreen.y, maxScreen.y),
      width: Math.abs(maxScreen.x - minScreen.x),
      height: Math.abs(maxScreen.y - minScreen.y)
    }
    
    return screenRect
  } catch (error) {
    logger.error('坐标转换失败', { 
      error: error instanceof Error ? error.message : String(error),
      worldRect,
      timestamp: new Date().toISOString()
    })
    return null
  }
}

// 更新所有标注框的屏幕坐标
const updateAllScreenCoordinates = () => {
  if (!currentView.value) {
    return
  }
  
  annotations.value.forEach(annotation => {
    const screenCoords = worldToScreen(annotation.coordinates)
    if (screenCoords) {
      annotation.screenCoordinates = screenCoords
    } else {
      logger.warn('无法更新标注框屏幕坐标', { 
        id: annotation.id,
        worldCoordinates: annotation.coordinates
      })
    }
  })
  
  logger.debug('已更新所有标注框的屏幕坐标', { 
    count: annotations.value.length,
    timestamp: new Date().toISOString()
  })
}

// 初始化：获取canvas容器
onMounted(async () => {
  logger.info('标注工具组件开始初始化', { timestamp: new Date().toISOString() })
  await nextTick()
  
  // 等待CAD viewer初始化完成
  let checkCount = 0
  const checkViewer = setInterval(() => {
    checkCount++
    try {
      const docManager = AcApDocManager.instance
      if (docManager && docManager.curView) {
        const view = docManager.curView
        canvasContainer.value = view.container
        currentView.value = view
        
        logger.info('标注工具初始化完成', {
          container: canvasContainer.value,
          canvas: view.canvas,
          checkCount,
          timestamp: new Date().toISOString()
        })
        
        // 更新所有标注框的屏幕坐标
        updateAllScreenCoordinates()
        
        // 保存视图变化处理器引用，以便在卸载时移除
        const viewChangedHandler = () => {
          logger.debug('视图变化，更新标注框位置', { timestamp: new Date().toISOString() })
          updateAllScreenCoordinates()
        }
        
        // 监听视图变化事件（缩放、平移等）
        view.events.viewChanged.addEventListener(viewChangedHandler)
        
        // 在卸载时移除监听器
        onUnmounted(() => {
          if (view && viewChangedHandler) {
            view.events.viewChanged.removeEventListener(viewChangedHandler)
          }
        })
        
        clearInterval(checkViewer)
      } else {
        logger.debug('等待CAD viewer初始化', { checkCount })
      }
    } catch (error) {
      logger.warn('等待CAD viewer初始化时出错', { 
        error: error instanceof Error ? error.message : String(error),
        checkCount 
      })
    }
  }, 100)

  // 10秒后停止检查
  setTimeout(() => {
    clearInterval(checkViewer)
    if (!canvasContainer.value) {
      logger.error('无法找到CAD viewer容器', {
        timeout: true,
        checkCount,
        timestamp: new Date().toISOString()
      })
    }
  }, 10000)

  // 监听点击外部区域关闭下拉框
  const handleClickOutside = (event: MouseEvent) => {
    if (showDropdown.value && dropdownSelect.value) {
      const target = event.target as HTMLElement
      if (!dropdownSelect.value.$el.contains(target) && 
          !svgOverlay.value?.contains(target)) {
        hideDropdown()
      }
    }
  }
  
  document.addEventListener('click', handleClickOutside)
  
  // 监听工具栏按钮触发的标注模式切换事件（通过window自定义事件）
  const handleToggleAnnotationMode = () => {
    logger.info('收到工具栏标注模式切换事件', { 
      currentMode: isDrawing.value,
      timestamp: new Date().toISOString()
    })
    toggleDrawingMode()
  }
  
  // 监听工具栏触发的清空标注事件
  const handleClearAllAnnotations = () => {
    logger.info('收到工具栏清空标注事件', { 
      annotationCount: annotations.value.length,
      timestamp: new Date().toISOString()
    })
    clearAllAnnotations()
  }
  
  window.addEventListener('toggle-annotation-mode', handleToggleAnnotationMode)
  window.addEventListener('clear-all-annotations', handleClearAllAnnotations)
  
  // 监听标注数量变化，通知工具栏更新按钮状态
  watch(
    () => annotations.value.length,
    (newCount) => {
      notifyAnnotationCountChanged()
      logger.debug('标注数量变化，通知工具栏', { 
        count: newCount,
        timestamp: new Date().toISOString()
      })
    },
    { immediate: true }
  )
  
  onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside)
    window.removeEventListener('toggle-annotation-mode', handleToggleAnnotationMode)
    window.removeEventListener('clear-all-annotations', handleClearAllAnnotations)
    logger.info('标注工具组件已卸载', { timestamp: new Date().toISOString() })
  })
})

// 监听容器大小变化
watch(canvasContainer, (newContainer) => {
  if (newContainer) {
    const resizeObserver = new ResizeObserver((entries) => {
      // 容器大小变化时，重新计算overlay位置
      const entry = entries[0]
      logger.debug('容器大小变化，更新overlay', {
        width: entry.contentRect.width,
        height: entry.contentRect.height,
        timestamp: new Date().toISOString()
      })
      // 如果下拉框正在显示，需要更新位置
      if (showDropdown.value && currentAnnotationId.value) {
        const annotation = annotations.value.find(a => a.id === currentAnnotationId.value)
        if (annotation && annotation.screenCoordinates) {
          dropdownPosition.value = {
            x: annotation.screenCoordinates.x + annotation.screenCoordinates.width + 10,
            y: annotation.screenCoordinates.y
          }
        }
      }
    })
    resizeObserver.observe(newContainer)
    
    logger.debug('已设置容器大小监听器', { timestamp: new Date().toISOString() })
  }
})
</script>

<style scoped>
.annotation-tool {
  position: relative;
  width: 100%;
  height: 100%;
}

.annotation-overlay {
  pointer-events: none;
}

/* 绘制模式时，整个overlay需要接收事件 */
.annotation-overlay.drawing-mode {
  pointer-events: auto;
}

.annotation-overlay .drawing-rect {
  pointer-events: none;
}

.annotation-overlay .annotation-rect {
  pointer-events: auto;
  cursor: pointer;
  transition: all 0.2s;
}

.annotation-overlay .annotation-rect:hover {
  stroke-width: 3;
  fill: rgba(64, 158, 255, 0.2);
}

.annotation-overlay .annotation-rect.selected {
  stroke: #67c23a;
  stroke-width: 3;
  fill: rgba(103, 194, 58, 0.2);
}

.annotation-label {
  pointer-events: none;
  font-weight: bold;
  background: rgba(255, 255, 255, 0.8);
}

.annotation-dropdown-container {
  background: white;
  padding: 8px;
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  border: 1px solid #dcdfe6;
}
</style>
