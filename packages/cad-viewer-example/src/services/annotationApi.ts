/**
 * 标注API服务
 * 用于与后端通信，发送标注信息
 */

import { logger } from '../utils/logger'

export interface AnnotationData {
  /** 矩形框坐标信息（世界坐标） */
  coordinates: {
    /** 矩形框左下角世界坐标 */
    minX: number
    minY: number
    /** 矩形框右上角世界坐标 */
    maxX: number
    maxY: number
  }
  /** 用户选择的标注选项 */
  annotationType: string
  /** 标注ID（用于标识不同的标注） */
  id?: string
  /** 时间戳 */
  timestamp?: string
}

/**
 * 发送标注数据到后端
 * @param data 标注数据
 * @returns Promise<Response>
 */
export async function submitAnnotation(data: AnnotationData): Promise<Response> {
  logger.info('准备发送标注数据到后端', { data })

  try {
    // TODO: 替换为实际的后端API地址
    const apiUrl = process.env.VITE_API_BASE_URL || '/api/annotations'
    
    const payload = {
      ...data,
      timestamp: data.timestamp || new Date().toISOString()
    }

    logger.debug('发送请求到后端', { url: apiUrl, payload })

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()
    logger.info('标注数据发送成功', { result })
    
    return response
  } catch (error) {
    logger.error('发送标注数据失败', { error, data })
    throw error
  }
}

/**
 * 获取所有标注数据
 * @returns Promise<AnnotationData[]>
 */
export async function getAnnotations(): Promise<AnnotationData[]> {
  logger.info('获取所有标注数据')
  
  try {
    const apiUrl = process.env.VITE_API_BASE_URL || '/api/annotations'
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    logger.info('获取标注数据成功', { count: data.length })
    
    return data
  } catch (error) {
    logger.error('获取标注数据失败', { error })
    throw error
  }
}
