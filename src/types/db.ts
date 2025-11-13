// 只定义用到的表结构，不需要共享整个 schema

/**
 * 业务数据表（用于场景1：拉取今天的数据转成任务）
 */
export interface BusinessData {
  id: number;
  name: string;
  date: Date;
  status: string;
  // 根据实际业务字段添加
  created_at?: Date;
  updated_at?: Date;
}

/**
 * 操作历史表（用于场景2：记录操作历史）
 */
export interface OperationHistory {
  id?: number; // 自增 ID，插入时不需要
  job_id: string;
  action: string;
  user_id: number;
  details: Record<string, any> | string; // JSON 数据
  created_at?: Date; // 数据库自动生成
}

/**
 * 操作历史插入数据（插入时不需要 id 和 created_at）
 */
export type OperationHistoryInsert = Omit<OperationHistory, 'id' | 'created_at'>;

