import { AcEdCommand } from '@mlightcad/cad-simple-viewer'

/**
 * Command to toggle annotation mode
 * This command emits a custom event that the AnnotationTool component listens to
 */
export class AcApAnnotationCmd extends AcEdCommand {
  async execute() {
    // 通过 window 自定义事件来触发标注模式切换
    // 这样可以在不修改 eventBus 类型定义的情况下实现功能
    window.dispatchEvent(new CustomEvent('toggle-annotation-mode'))
  }
}
