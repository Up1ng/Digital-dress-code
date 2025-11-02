<template>
  <Card class="entity-card">
    <template #title>
      <div class="card-header">
        <span>{{ environment.name }}</span>
      </div>
    </template>
    <template #content>
      <p class="description">Параметров: {{ parameterCount }}</p>
    </template>
    <template #footer>
      <div class="card-footer">
        <div class="action-group primary">
          <Button icon="pi pi-pencil" label="Редактировать" text @click="() => emit('edit')" />
          <Button icon="pi pi-download" label="Экспорт" text @click="() => emit('export')" />
        </div>
        <div class="action-group secondary">
          <Button icon="pi pi-trash" label="Удалить" text severity="danger" @click="() => emit('delete')" />
        </div>
      </div>
    </template>
  </Card>
</template>

<script setup>
import { computed } from 'vue'
import Button from 'primevue/button'
import Card from 'primevue/card'

const props = defineProps({
  environment: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['edit', 'export', 'delete'])

function countParameters(node) {
  if (!node || typeof node !== 'object') return 0
  if ('value' in node && 'privacy_level' in node) return 1
  return Object.values(node).reduce((total, value) => total + countParameters(value), 0)
}

const parameterCount = computed(() => countParameters(props.environment.data))
</script>

<style scoped>
.description {
  margin: 0;
}

.card-footer :deep(.p-button-text) {
  font-weight: 600;
}
</style>
