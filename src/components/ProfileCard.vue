<template>
  <Card class="entity-card profile-card">
    <template #title>
      <div class="card-header">
        <span>{{ profile.name }}</span>
        <Tag :value="templateName" severity="secondary" v-if="templateName" />
      </div>
    </template>
    <template #subtitle>
      <span v-if="environmentName">Окружение: {{ environmentName }}</span>
    </template>
    <template #content>
      <div class="card-content">
        <Dropdown
          :model-value="privacyLevel"
          :options="privacyOptions"
          option-label="label"
          option-value="value"
          placeholder="Выберите приватность"
          class="w-full"
          @update:model-value="onPrivacyChange"
        />
      </div>
    </template>
    <template #footer>
      <div class="card-footer">
        <div class="action-group primary">
          <Button icon="pi pi-play" label="Старт" @click="() => emit('start')" />
        </div>
        <div class="action-group secondary">
          <Button icon="pi pi-pencil" label="Редактировать" text @click="() => emit('edit')" />
          <Button icon="pi pi-trash" label="Удалить" text severity="danger" @click="() => emit('delete')" />
        </div>
      </div>
    </template>
  </Card>
</template>

<script setup>
import Button from 'primevue/button'
import Card from 'primevue/card'
import Dropdown from 'primevue/dropdown'
import Tag from 'primevue/tag'

const props = defineProps({
  profile: {
    type: Object,
    required: true
  },
  privacyLevel: {
    type: String,
    default: 'medium'
  },
  templateName: {
    type: String,
    default: ''
  },
  environmentName: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['start', 'edit', 'delete', 'privacy-change'])

const privacyOptions = [
  { label: 'Низкий', value: 'low' },
  { label: 'Средний', value: 'medium' },
  { label: 'Высокий', value: 'high' }
]

function onPrivacyChange(value) {
  emit('privacy-change', value)
}
</script>

<style scoped>
.profile-card :deep(.p-card-subtitle) {
  color: var(--color-text-secondary);
  font-weight: 500;
}

.card-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.card-footer :deep(.p-button-text) {
  font-weight: 600;
}
</style>
