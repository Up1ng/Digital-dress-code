<template>
  <RouterView />
</template>

<script setup>
import { onMounted } from 'vue'
import { useTemplatesStore } from './stores/templates'
import { useEnvironmentsStore } from './stores/environments'
import { useProfilesStore } from './stores/profiles'

const templatesStore = useTemplatesStore()
const environmentsStore = useEnvironmentsStore()
const profilesStore = useProfilesStore()

onMounted(async () => {
  await Promise.all([
    templatesStore.load(),
    environmentsStore.load(),
    profilesStore.load()
  ])
})
</script>
