<template>
  <div class="flag-table">
    <div class="table-container">
      <table class="table">
        <thead>
          <tr>
            <th class="checkbox-col">
              <label class="checkbox-wrapper">
                <input
                  type="checkbox"
                  :checked="isAllSelected"
                  @change="handleSelectAll"
                />
              </label>
            </th>
            <th class="status-col">ステータス</th>
            <th class="name-col">加盟店名</th>
            <th class="id-col">加盟店ID</th>
            <th class="reason-col">設定理由</th>
            <th class="date-col">設定日</th>
            <th class="expire-col">期限日</th>
            <th class="excluded-col">割り当て除外</th>
            <th class="actions-col">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr 
            v-for="flag in flags" 
            :key="flag.franchiseeId"
            :class="['table-row', getRowClass(flag)]"
          >
            <td class="checkbox-cell">
              <label class="checkbox-wrapper">
                <input
                  type="checkbox"
                  :value="flag.franchiseeId"
                  :checked="selected.includes(flag.franchiseeId)"
                  @change="handleSelection"
                />
              </label>
            </td>
            <td class="status-cell">
              <StatusBadge :status="flag.flagStatus" />
            </td>
            <td class="name-cell">
              <div class="name-info">
                <span class="name-text">{{ flag.franchiseName }}</span>
              </div>
            </td>
            <td class="id-cell">
              <span class="id-text">{{ flag.franchiseeId }}</span>
            </td>
            <td class="reason-cell">
              <span class="reason-text" :title="flag.reason">
                {{ flag.reason || '-' }}
              </span>
            </td>
            <td class="date-cell">
              <span class="date-text">
                {{ formatDate(flag.flagSetDate) }}
              </span>
            </td>
            <td class="expire-cell">
              <span class="expire-text" :class="{ 'expired': isExpired(flag.flagExpireDate) }">
                {{ formatDate(flag.flagExpireDate) || '-' }}
              </span>
            </td>
            <td class="excluded-cell">
              <Icon 
                :name="flag.excludedFromAssignment ? 'check-circle' : 'times-circle'"
                :class="flag.excludedFromAssignment ? 'excluded-yes' : 'excluded-no'"
              />
            </td>
            <td class="actions-cell">
              <div class="action-buttons">
                <button
                  class="action-btn edit-btn"
                  @click="$emit('update-flag', flag)"
                  :title="'フラグを更新'"
                >
                  <Icon name="edit" />
                </button>
                <button
                  class="action-btn history-btn"
                  @click="$emit('view-history', flag.franchiseeId, flag.franchiseName)"
                  :title="'履歴を表示'"
                >
                  <Icon name="history" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="flags.length === 0" class="empty-state">
      <Icon name="flag" class="empty-icon" />
      <p class="empty-text">フラグ設定されている加盟店がありません</p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import Icon from '@/components/common/Icon.vue'
import StatusBadge from './StatusBadge.vue'

const props = defineProps({
  flags: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  selected: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update-flag', 'selection-change', 'view-history'])

const isAllSelected = computed(() => {
  return props.flags.length > 0 && props.selected.length === props.flags.length
})

const handleSelectAll = (event) => {
  if (event.target.checked) {
    emit('selection-change', props.flags.map(flag => flag.franchiseeId))
  } else {
    emit('selection-change', [])
  }
}

const handleSelection = (event) => {
  const franchiseeId = event.target.value
  let newSelection = [...props.selected]
  
  if (event.target.checked) {
    if (!newSelection.includes(franchiseeId)) {
      newSelection.push(franchiseeId)
    }
  } else {
    newSelection = newSelection.filter(id => id !== franchiseeId)
  }
  
  emit('selection-change', newSelection)
}

const getRowClass = (flag) => {
  const classes = []
  
  if (flag.flagStatus === 'ブラック') {
    classes.push('row-blacklisted')
  } else if (flag.flagStatus === '保留') {
    classes.push('row-on-hold')
  } else if (flag.flagStatus === '不在') {
    classes.push('row-absent')
  }
  
  if (isExpired(flag.flagExpireDate)) {
    classes.push('row-expired')
  }
  
  return classes.join(' ')
}

const formatDate = (date) => {
  if (!date) return ''
  
  try {
    const d = new Date(date)
    return d.toLocaleDateString('ja-JP')
  } catch (error) {
    return ''
  }
}

const isExpired = (expireDate) => {
  if (!expireDate) return false
  
  try {
    const expire = new Date(expireDate)
    const now = new Date()
    return expire < now
  } catch (error) {
    return false
  }
}
</script>

<style scoped>
.flag-table {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.table-container {
  flex: 1;
  overflow-x: auto;
  overflow-y: auto;
}

.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
  min-width: 800px;
}

.table th {
  background-color: #f8fafc;
  color: #374151;
  font-weight: 600;
  padding: 0.75rem 0.5rem;
  text-align: left;
  border-bottom: 2px solid #e5e7eb;
  white-space: nowrap;
  position: sticky;
  top: 0;
  z-index: 10;
}

.table td {
  padding: 0.75rem 0.5rem;
  border-bottom: 1px solid #f3f4f6;
  vertical-align: middle;
}

.table-row:hover {
  background-color: #f8fafc;
}

.row-blacklisted {
  background-color: #fef2f2;
}

.row-on-hold {
  background-color: #fef3c7;
}

.row-absent {
  background-color: #eff6ff;
}

.row-expired {
  background-color: #f3f4f6;
}

/* Column widths */
.checkbox-col { width: 50px; }
.status-col { width: 100px; }
.name-col { width: 200px; }
.id-col { width: 150px; }
.reason-col { width: 200px; }
.date-col { width: 100px; }
.expire-col { width: 100px; }
.excluded-col { width: 80px; }
.actions-col { width: 120px; }

.checkbox-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.checkbox-wrapper input[type="checkbox"] {
  margin: 0;
  cursor: pointer;
}

.status-cell {
  text-align: center;
}

.name-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.name-text {
  font-weight: 600;
  color: #1f2937;
}

.id-text {
  font-family: monospace;
  color: #6b7280;
  font-size: 0.8125rem;
}

.reason-text {
  color: #374151;
  display: block;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.date-text,
.expire-text {
  color: #6b7280;
  font-size: 0.8125rem;
}

.expire-text.expired {
  color: #ef4444;
  font-weight: 600;
}

.excluded-cell {
  text-align: center;
}

.excluded-yes {
  color: #ef4444;
}

.excluded-no {
  color: #10b981;
}

.action-buttons {
  display: flex;
  gap: 0.25rem;
  justify-content: center;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.875rem;
}

.edit-btn {
  background-color: #3b82f6;
  color: white;
}

.edit-btn:hover {
  background-color: #2563eb;
  transform: translateY(-1px);
}

.history-btn {
  background-color: #6b7280;
  color: white;
}

.history-btn:hover {
  background-color: #4b5563;
  transform: translateY(-1px);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  color: #9ca3af;
  flex: 1;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.empty-text {
  font-size: 1.125rem;
  margin: 0;
}

/* レスポンシブ対応 */
@media (max-width: 1024px) {
  .table {
    min-width: 1000px;
  }
  
  .reason-col {
    width: 150px;
  }
  
  .reason-text {
    max-width: 130px;
  }
}

@media (max-width: 768px) {
  .table {
    font-size: 0.75rem;
  }
  
  .table th,
  .table td {
    padding: 0.5rem 0.25rem;
  }
  
  .action-btn {
    width: 1.75rem;
    height: 1.75rem;
    font-size: 0.75rem;
  }
}
</style>