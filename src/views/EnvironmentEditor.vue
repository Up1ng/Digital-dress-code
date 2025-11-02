<template>
  <div class="page">
    <div class="page-header">
      <div class="header-left">
        <Button icon="pi pi-arrow-left" label="Назад" text @click="goBack"/>
        <InputText v-model="localEnvironment.name" placeholder="Название окружения" class="name-input"/>
      </div>
      <div class="header-right">
        <Button icon="pi pi-save" label="Сохранить" severity="success" @click="saveEnvironment"/>
        <Button icon="pi pi-times" label="Отмена" text @click="goBack"/>
        <Button icon="pi pi-download" label="Экспорт" text @click="exportEnvironment"/>
      </div>
    </div>
    <div class="tab-shell">
      <TabView>
        <TabPanel header="Удобный редактор">
          <div class="comfortable-editor">
            <div class="field-row" v-for="field in fields" :key="field.path">
              <div class="field-label">{{ field.label }}</div>
              <InputText :model-value="field.value"
                         @update:model-value="(val) => updateField(field.path, val, field.privacy_level)"/>
              <Dropdown
                  :model-value="field.privacy_level"
                  :options="privacyOptions"
                  option-label="label"
                  option-value="value"
                  class="privacy-select"
                  @update:model-value="(val) => updateField(field.path, field.value, val)"
              />
            </div>
            <Button icon="pi pi-plus" label="Добавить поле" text @click="showAddField = true"/>
          </div>
        </TabPanel>
        <TabPanel header="Raw JSON">
          <div class="json-editor">
            <Textarea v-model="jsonEditorValue" rows="20" auto-resize/>
            <Button label="Применить JSON" icon="pi pi-check" class="apply-button" @click="applyJson"/>
          </div>
        </TabPanel>
      </TabView>
    </div>

    <Dialog v-model:visible="showAddField" modal header="Добавить новое поле" :style="{ width: '400px' }">
      <div class="dialog-content">
        <label for="path">Путь (например, employee.department)</label>
        <InputText id="path" v-model="newFieldPath"/>
        <label for="value">Значение</label>
        <InputText id="value" v-model="newFieldValue"/>
        <label for="privacy">Приватность</label>
        <Dropdown
            id="privacy"
            v-model="newFieldPrivacy"
            :options="privacyOptions"
            option-label="label"
            option-value="value"
        />
      </div>
      <template #footer>
        <Button label="Отмена" text @click="showAddField = false"/>
        <Button label="Добавить" icon="pi pi-check" @click="addField"/>
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import {computed, reactive, ref, watch} from 'vue'
import {useRouter, useRoute} from 'vue-router'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import Dropdown from 'primevue/dropdown'
import InputText from 'primevue/inputtext'
import TabPanel from 'primevue/tabpanel'
import TabView from 'primevue/tabview'
import Textarea from 'primevue/textarea'
import {useEnvironmentsStore} from '../stores/environments'

const router = useRouter()
const route = useRoute()
const environmentsStore = useEnvironmentsStore()

const environmentId = route.params.id

const localEnvironment = reactive({
  id: environmentId || crypto.randomUUID(),
  name: 'Новый набор данных',
  data: getDefaultEnvironment()
})

if (environmentId) {
  const stored = environmentsStore.getById(environmentId)
  if (stored) {
    Object.assign(localEnvironment, JSON.parse(JSON.stringify(stored)))
  }
}

const privacyOptions = [
  {label: 'Низкий', value: 'low'},
  {label: 'Средний', value: 'medium'},
  {label: 'Высокий', value: 'high'}
]

const jsonEditorValue = ref(JSON.stringify(localEnvironment.data, null, 2))
const showAddField = ref(false)
const newFieldPath = ref('')
const newFieldValue = ref('')
const newFieldPrivacy = ref('low')

const fields = computed(() => {
  const result = []
  collectFields(localEnvironment.data, [], result)
  return result
})

watch(
    () => JSON.stringify(localEnvironment.data),
    (serialized) => {
      jsonEditorValue.value = JSON.stringify(JSON.parse(serialized), null, 2)
    }
)

function goBack() {
  router.push({name: 'dashboard'})
}

function updateField(path, value, privacy) {
  setField(localEnvironment.data, path, value, privacy)
}

function applyJson() {
  try {
    const parsed = JSON.parse(jsonEditorValue.value)
    localEnvironment.data = parsed
  } catch (error) {
    alert('Не удалось разобрать JSON: ' + error.message)
  }
}

async function saveEnvironment() {
  await environmentsStore.upsert(JSON.parse(JSON.stringify(localEnvironment)))
  goBack()
}

function exportEnvironment() {
  const data = JSON.stringify(localEnvironment, null, 2)
  const blob = new Blob([data], {type: 'application/json'})
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${localEnvironment.name || 'environment'}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

function addField() {
  if (!newFieldPath.value) return
  setField(localEnvironment.data, newFieldPath.value, newFieldValue.value, newFieldPrivacy.value)
  showAddField.value = false
  newFieldPath.value = ''
  newFieldValue.value = ''
  newFieldPrivacy.value = 'low'
}

function collectFields(node, path, result) {
  if (!node || typeof node !== 'object') return
  if ('value' in node && 'privacy_level' in node) {
    result.push({
      path: path.join('.'),
      label: formatLabel(path[path.length - 1] || ''),
      value: node.value ?? '',
      privacy_level: node.privacy_level || 'low'
    })
    return
  }
  Object.entries(node).forEach(([key, value]) => {
    collectFields(value, [...path, key], result)
  })
}

function setField(target, path, value, privacy) {
  const parts = path.split('.').filter(Boolean)
  if (!parts.length) return
  let current = target
  parts.forEach((part, index) => {
    if (index === parts.length - 1) {
      current[part] = {
        value,
        privacy_level: privacy
      }
    } else {
      if (!current[part] || typeof current[part] !== 'object' || ('value' in current[part] && 'privacy_level' in current[part])) {
        current[part] = {}
      }
      current = current[part]
    }
  })
}

function formatLabel(segment) {
  return segment
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function getDefaultEnvironment() {
  return {
    employee: {
      full_name: {value: 'Иванов Сергей Петрович', privacy_level: 'low'},
      position: {value: 'Руководитель проектов', privacy_level: 'low'},
      email: {value: 'sergey.ivanov@example.com', privacy_level: 'medium'},
      phone: {value: '+7 (999) 123-45-67', privacy_level: 'high'}
    },
    branding: {
      logo_url: {value: 'https://placehold.co/300x120?text=Logo', privacy_level: 'low'}
    }
  }
}
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: clamp(1.25rem, 2.5vw, 2.5rem);
  padding: clamp(1.5rem, 3vw, 3rem);
}

.page-header {
  display: flex;
  justify-content: space-between;
  gap: 1.25rem;
  align-items: center;
  flex-wrap: wrap;
  background: var(--color-surface);
  border: 1px solid rgba(0, 148, 255, 0.2);
  border-radius: var(--radius-xl);
  padding: clamp(1.5rem, 2.5vw, 2rem);
  box-shadow: 0 28px 56px rgba(0, 148, 255, 0.12);
}

.header-left {
  display: flex;
  gap: 0.85rem;
  align-items: center;
  position: relative;
  z-index: 1;
  flex-wrap: wrap;
}

.header-right {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.name-input {
  min-width: min(300px, 100%);
}

.comfortable-editor,
.json-editor {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: clamp(1.5rem, 2vw, 2.25rem);
  box-shadow: var(--shadow-card);
}

.tab-shell {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  background: var(--color-surface);
  border-radius: var(--radius-xl);
  border: 1px solid rgba(0, 148, 255, 0.16);
  padding: clamp(1.5rem, 2.5vw, 2rem);
  box-shadow: var(--shadow-card);
}

.tab-shell :deep(.p-tabview) {
  gap: 1.5rem;
}

.tab-shell :deep(.p-tabview-panels) {
  padding: 0;
}

.field-row {
  display: grid;
  grid-template-columns: minmax(160px, 220px) minmax(0, 1fr) minmax(180px, 220px);
  gap: 0.85rem;
  align-items: center;
  background: linear-gradient(135deg, rgba(51, 191, 255, 0.12), rgba(255, 255, 255, 0.95));
  border: 1px solid rgba(0, 148, 255, 0.18);
  border-radius: var(--radius-lg);
  padding: 0.75rem 1rem;
}

.field-label {
  font-weight: 600;
  color: var(--color-text);
}

.privacy-select {
  width: 100%;
}

.field-row :deep(.p-inputtext),
.field-row :deep(.p-dropdown) {
  background: var(--color-surface);
}

.json-editor :deep(.p-textarea) {
  min-height: 320px;
}

.apply-button {
  align-self: flex-end;
}

.dialog-content {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.dialog-content label {
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--color-text-secondary);
}

@media (max-width: 960px) {
  .page-header {
    flex-direction: column;
    align-items: stretch;
  }

  .field-row {
    grid-template-columns: 1fr;
  }
}
</style>
