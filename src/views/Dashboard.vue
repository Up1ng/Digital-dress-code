<template>
  <div class="page">
    <header class="page-header">
      <div class="header-content">
        <span class="eyebrow">Цифровая платформа</span>
        <h1>Цифровой дресс-код</h1>
        <p class="subtitle">Управляйте шаблонами, окружениями и профилями для персонализированных фонов</p>
      </div>
      <div class="header-illustration" aria-hidden="true">
        <div class="orb orb-primary"></div>
        <div class="orb orb-secondary"></div>
      </div>
    </header>

    <div class="tab-shell">
      <TabView>
        <TabPanel header="Профили">
          <section class="section">
            <div class="section-header">
              <div class="section-text">
                <h2>Профили сотрудников</h2>
                <p>Создавайте уникальные подборки данных и мгновенно запускайте генерацию визуалов.</p>
              </div>
              <Button icon="pi pi-plus" label="Создать профиль" @click="openProfileDialog()"/>
            </div>
            <div class="cards-grid" v-if="profiles.length">
              <ProfileCard
                  v-for="profile in profiles"
                  :key="profile.id"
                  :profile="profile"
                  :template-name="templateName(profile.templateId)"
                  :environment-name="environmentName(profile.environmentId)"
                  :privacy-level="privacySelections[profile.id]"
                  @privacy-change="(value) => (privacySelections[profile.id] = value)"
                  @start="() => handleStart(profile)"
                  @edit="() => openProfileDialog(profile)"
                  @delete="() => deleteProfile(profile.id)"
              />
            </div>
            <div v-else class="empty-state">
              <div class="empty-badge">Нет профилей</div>
              <p>Создайте первый профиль, чтобы запустить цифровую витрину компании.</p>
            </div>
          </section>
        </TabPanel>
        <TabPanel header="Шаблоны">
          <section class="section">
            <div class="section-header">
              <div class="section-text">
                <h2>Библиотека шаблонов</h2>
                <p>Редактируйте композиции и экспортируйте готовые JSON-модели.</p>
              </div>
              <div class="section-actions">
                <Button icon="pi pi-plus" label="Создать шаблон" @click="createTemplate"/>
                <Button icon="pi pi-upload" label="Импортировать" text @click="() => templateFileInput?.click()"/>
                <input
                    ref="templateFileInput"
                    type="file"
                    accept="application/json"
                    class="hidden-input"
                    @change="importTemplates"
                />
              </div>
            </div>
            <div class="cards-grid" v-if="templates.length">
              <TemplateCard
                  v-for="template in templates"
                  :key="template.id"
                  :template="template"
                  @edit="() => editTemplate(template.id)"
                  @export="() => exportTemplate(template)"
                  @delete="() => deleteTemplate(template.id)"
              />
            </div>
            <div v-else class="empty-state">
              <div class="empty-badge">Нет шаблонов</div>
              <p>Создайте новый шаблон или импортируйте существующий JSON-файл.</p>
            </div>
          </section>
        </TabPanel>
        <TabPanel header="Окружения">
          <section class="section">
            <div class="section-header">
              <div class="section-text">
                <h2>Данные окружений</h2>
                <p>Управляйте контентом и уровнями приватности для ваших сценариев.</p>
              </div>
              <div class="section-actions">
                <Button icon="pi pi-plus" label="Создать окружение" @click="createEnvironment"/>
                <Button icon="pi pi-upload" label="Импортировать" text @click="() => environmentFileInput?.click()"/>
                <input
                    ref="environmentFileInput"
                    type="file"
                    accept="application/json"
                    class="hidden-input"
                    @change="importEnvironments"
                />
              </div>
            </div>
            <div class="cards-grid" v-if="environments.length">
              <EnvironmentCard
                  v-for="environment in environments"
                  :key="environment.id"
                  :environment="environment"
                  @edit="() => editEnvironment(environment.id)"
                  @export="() => exportEnvironment(environment)"
                  @delete="() => deleteEnvironment(environment.id)"
              />
            </div>
            <div v-else class="empty-state">
              <div class="empty-badge">Нет окружений</div>
              <p>Добавьте окружение или импортируйте данные из JSON.</p>
            </div>
          </section>
        </TabPanel>
      </TabView>
    </div>

    <Dialog v-model:visible="profileDialogVisible" modal header="Профиль" :style="{ width: '420px' }">
      <div class="dialog-content">
        <label for="profile-name">Название</label>
        <InputText id="profile-name" v-model="profileDraft.name"/>
        <label for="profile-template">Шаблон</label>
        <Dropdown
            id="profile-template"
            v-model="profileDraft.templateId"
            :options="templates"
            option-label="name"
            option-value="id"
            placeholder="Выберите шаблон"
        />
        <label for="profile-environment">Окружение</label>
        <Dropdown
            id="profile-environment"
            v-model="profileDraft.environmentId"
            :options="environments"
            option-label="name"
            option-value="id"
            placeholder="Выберите окружение"
        />
        <label for="profile-background-mode">Фон</label>
        <Dropdown
            id="profile-background-mode"
            v-model="profileDraft.backgroundMode"
            :options="backgroundModeOptions"
            option-label="label"
            option-value="value"
            placeholder="Выберите режим"
        />
        <div v-if="profileDraft.backgroundMode === 'static'" class="static-background-select">
          <Dropdown
              id="profile-background"
              v-model="profileDraft.backgroundSrc"
              :options="staticBackgroundOptions"
              option-label="label"
              option-value="value"
              placeholder="Выберите фон"
              :loading="isLoadingBackgrounds"
              :disabled="isLoadingBackgrounds || (!staticBackgroundOptions.length && !!backgroundLoadError)"
          />
          <small v-if="backgroundLoadError" class="field-hint">{{ backgroundLoadError }}</small>
        </div>
        <div class="checkbox-row">
          <Checkbox
              input-id="profile-adjust-lighting"
              v-model="profileDraft.adjustLighting"
              :binary="true"
          />
          <label for="profile-adjust-lighting">Подстраивать освещение</label>
        </div>
        <!-- Яркостный коэффициент освещения -->
        <div class="field">
          <label for="lighting-coeff">Коэф. освещения (0–2, шаг 0.1)</label>
          <div class="field-row">
            <InputNumber
                v-model="profileDraft.lightingCoeff"
                :min="0"
                :max="2"
                :step="0.1"
                mode="decimal"
                :showButtons="true"
                inputId="lighting-coeff"
                :disabled="!profileDraft.adjustLighting"
                style="width: 140px"
            />
          </div>
          <small class="field-hint">
            Управляет тем, насколько сильно освещение сцены влияет на фон (работает при включённой опции «Подстраивать освещение»).
          </small>
        </div>

        <!-- Общая яркость фона -->
        <div class="field">
          <label for="bg-brightness">Яркость фона (0–10, шаг 0.5)</label>
          <div class="field-row">
            <InputNumber
                v-model="profileDraft.bgBrightness"
                :min="0"
                :max="10"
                :step="0.5"
                mode="decimal"
                :showButtons="true"
                inputId="bg-brightness"
                style="width: 140px"
            />
          </div>
          <small class="field-hint">
            Базовая яркость подставляемого заднего фона.
          </small>
        </div>

      </div>
      <template #footer>
        <Button label="Отмена" text @click="closeProfileDialog"/>
        <Button label="Сохранить" icon="pi pi-check" :disabled="!canSaveProfile" @click="saveProfile"/>
      </template>
    </Dialog>

    <Dialog
        v-model:visible="generatedImageVisible"
        header="Виртуальный фон"
        modal
        :style="{ width: '820px' }"
    >
      <VirtualBackgroundPreview
          v-if="generatedImageUrl"
          :active="generatedImageVisible"
          :background-url="generatedImageUrl"
          :lighting-coeff="previewLightingCoeff"
          :bg-brightness="previewBgBrightness"
          :adjust-lighting="previewAdjustLighting"
          model-url="/models/rvm_mobilenetv3_fp16.onnx"
      />

      <template #footer>
        <Button
            v-if="generatedImageUrl"
            icon="pi pi-download"
            label="Скачать фон"
            @click="downloadGenerated"
        />
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import {computed, reactive, ref, watch} from 'vue'
import {useRouter} from 'vue-router'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import Dropdown from 'primevue/dropdown'
import InputText from 'primevue/inputtext'
import Checkbox from 'primevue/checkbox'
import TabPanel from 'primevue/tabpanel'
import TabView from 'primevue/tabview'
import {useTemplatesStore} from '../stores/templates'
import {useEnvironmentsStore} from '../stores/environments'
import {useProfilesStore} from '../stores/profiles'
import ProfileCard from '../components/ProfileCard.vue'
import TemplateCard from '../components/TemplateCard.vue'
import EnvironmentCard from '../components/EnvironmentCard.vue'
import VirtualBackgroundPreview from '../components/VirtualBackgroundPreview.vue'
import {generateImageFromProfile} from '../utils/generator'
import Slider from 'primevue/slider'
import InputNumber from 'primevue/inputnumber'

const router = useRouter()

const templatesStore = useTemplatesStore()
const environmentsStore = useEnvironmentsStore()
const profilesStore = useProfilesStore()

const templateFileInput = ref(null)
const environmentFileInput = ref(null)

const privacySelections = reactive({})

const profileDialogVisible = ref(false)
const profileDraft = reactive({
  id: '',
  name: '',
  templateId: '',
  environmentId: '',
  backgroundMode: 'template',
  backgroundSrc: '',
  adjustLighting: false,
  lightingCoeff: 1.5,
  bgBrightness: 5
})
const generatedImageVisible = ref(false)
const generatedImageUrl = ref('')
const activeProfile = ref(null)

const staticBackgrounds = ref([])
const isLoadingBackgrounds = ref(false)
const backgroundLoadError = ref('')

const previewLightingCoeff = computed(() => activeProfile.value?.lightingCoeff ?? 1.5)
const previewBgBrightness = computed(() => activeProfile.value?.bgBrightness ?? 5)


const backgroundModeOptions = [
  {label: 'Использовать шаблон', value: 'template'},
  {label: 'Статичная картинка', value: 'static'}
]

const templates = computed(() => templatesStore.templates)
const environments = computed(() => environmentsStore.environments)
const profiles = computed(() => profilesStore.profiles)
const staticBackgroundOptions = computed(() =>
    staticBackgrounds.value.map((item) => ({label: item.name, value: item.src}))
)
const previewAdjustLighting = computed(() => Boolean(activeProfile.value?.adjustLighting))

async function loadStaticBackgrounds() {
  if (staticBackgrounds.value.length || isLoadingBackgrounds.value) return
  isLoadingBackgrounds.value = true
  backgroundLoadError.value = ''
  try {
    const response = await fetch('/backgrounds/index.json', {cache: 'no-cache'})
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    const items = await response.json()
    if (Array.isArray(items)) {
      staticBackgrounds.value = items
    } else {
      throw new Error('Invalid backgrounds payload')
    }
  } catch (error) {
    console.error('Failed to load static backgrounds', error)
    backgroundLoadError.value = 'Не удалось загрузить список фонов'
  } finally {
    isLoadingBackgrounds.value = false
  }
}

watch(
    profiles,
    (items) => {
      items.forEach((profile) => {
        if (!privacySelections[profile.id]) {
          privacySelections[profile.id] = 'medium'
        }
      })
    },
    {immediate: true}
)

watch(generatedImageVisible, (visible) => {
  if (!visible) {
    activeProfile.value = null
  }
})

function templateName(id) {
  return templates.value.find((item) => item.id === id)?.name || '—'
}

function environmentName(id) {
  return environments.value.find((item) => item.id === id)?.name || '—'
}

function createTemplate() {
  router.push({name: 'template-editor'})
}

function editTemplate(id) {
  router.push({name: 'template-editor', params: {id}})
}

function createEnvironment() {
  router.push({name: 'environment-editor'})
}

function editEnvironment(id) {
  router.push({name: 'environment-editor', params: {id}})
}

function exportTemplate(template) {
  const data = JSON.stringify(template, null, 2)
  const blob = new Blob([data], {type: 'application/json'})
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${template.name || 'template'}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

function exportEnvironment(environment) {
  const data = JSON.stringify(environment, null, 2)
  const blob = new Blob([data], {type: 'application/json'})
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${environment.name || 'environment'}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

async function openProfileDialog(profile = null) {
  await loadStaticBackgrounds()
  const defaults = {
    id: '',
    name: 'Новый профиль',
    templateId: templates.value[0]?.id || '',
    environmentId: environments.value[0]?.id || '',
    backgroundMode: 'template',
    backgroundSrc: '',
    adjustLighting: false,
    lightingCoeff: 1.5,
    bgBrightness: 5
  }
  if (profile) {
    const backgroundMode = profile.backgroundMode || profile.background?.mode || 'template'
    const backgroundSrc =
        backgroundMode === 'static'
            ? profile.backgroundSrc || profile.background?.src || ''
            : ''
    Object.assign(profileDraft, defaults, profile, {
      backgroundMode,
      backgroundSrc,
      adjustLighting: profile.adjustLighting ?? profile.background?.adjustLighting ?? false,
      lightingCoeff: profileDraft.lightingCoeff,
      bgBrightness: profileDraft.bgBrightness
    })
  } else {
    Object.assign(profileDraft, defaults)
  }
  profileDialogVisible.value = true
}

function closeProfileDialog() {
  profileDialogVisible.value = false
}

const canSaveProfile = computed(() => {
  const baseValid =
      Boolean(profileDraft.name) &&
      Boolean(profileDraft.templateId) &&
      Boolean(profileDraft.environmentId)
  const backgroundValid =
      profileDraft.backgroundMode !== 'static' || Boolean(profileDraft.backgroundSrc)
  return baseValid && backgroundValid
})

async function saveProfile() {
  const backgroundMode = profileDraft.backgroundMode || 'template'
  const backgroundSrc = backgroundMode === 'static' ? profileDraft.backgroundSrc : ''
  const payload = {
    id: profileDraft.id || crypto.randomUUID(),
    name: profileDraft.name,
    templateId: profileDraft.templateId,
    environmentId: profileDraft.environmentId,
    backgroundMode,
    backgroundSrc,
    adjustLighting: profileDraft.adjustLighting
  }
  await profilesStore.upsert(payload)
  if (!privacySelections[payload.id]) {
    privacySelections[payload.id] = 'medium'
  }
  profileDialogVisible.value = false
}

async function deleteProfile(id) {
  await profilesStore.remove(id)
  delete privacySelections[id]
}

async function deleteTemplate(id) {
  await templatesStore.remove(id)
}

async function deleteEnvironment(id) {
  await environmentsStore.remove(id)
}

function readJsonFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target.result)
        resolve(Array.isArray(json) ? json : [json])
      } catch (error) {
        reject(error)
      }
    }
    reader.onerror = reject
    reader.readAsText(file)
  })
}

async function importTemplates(event) {
  const file = event.target.files?.[0]
  if (!file) return
  try {
    const items = await readJsonFromFile(file)
    await templatesStore.importMany(items)
  } catch (error) {
    alert('Не удалось импортировать шаблоны: ' + error.message)
  } finally {
    event.target.value = ''
  }
}

async function importEnvironments(event) {
  const file = event.target.files?.[0]
  if (!file) return
  try {
    const items = await readJsonFromFile(file)
    await environmentsStore.importMany(items)
  } catch (error) {
    alert('Не удалось импортировать окружения: ' + error.message)
  } finally {
    event.target.value = ''
  }
}

async function handleStart(profile) {
  if (!privacySelections[profile.id]) {
    privacySelections[profile.id] = 'medium'
  }
  const privacyLevel = privacySelections[profile.id]
  const template = templatesStore.getById(profile.templateId)
  const environment = environmentsStore.getById(profile.environmentId)
  if (!template || !environment) {
    alert('Не найден шаблон или окружение для профиля')
    return
  }
  const backgroundMode = profile.backgroundMode || 'template'
  const backgroundSrc = backgroundMode === 'static' ? profile.backgroundSrc : ''
  const adjustLighting = Boolean(profile.adjustLighting)
  try {
    activeProfile.value = {
      ...profile,
      backgroundMode,
      backgroundSrc,
      adjustLighting,
      lightingCoeff: profile.lightingCoeff ?? 1.5,
      bgBrightness: profile.bgBrightness ?? 5
    }
    generatedImageUrl.value = await generateImageFromProfile({
      template,
      environment,
      privacyLevel,
      background: {mode: backgroundMode, src: backgroundSrc}
    })
    generatedImageVisible.value = true
  } catch (error) {
    alert('Не удалось сгенерировать изображение: ' + error.message)
    activeProfile.value = null
  }
}

function downloadGenerated() {
  if (!generatedImageUrl.value) return
  const link = document.createElement('a')
  link.href = generatedImageUrl.value
  link.download = 'profile-background.png'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: clamp(1.5rem, 2.5vw, 2.75rem);
  padding: clamp(1.5rem, 3vw, 3rem);
}

.page-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 240px;
  gap: 2rem;
  align-items: center;
  padding: clamp(2rem, 4vw, 3.5rem);
  background: var(--color-surface);
  border-radius: var(--radius-xl);
  border: 1px solid rgba(0, 148, 255, 0.2);
  box-shadow: 0 40px 80px rgba(0, 148, 255, 0.08);
  position: relative;
  overflow: hidden;
}

.header-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  position: relative;
  z-index: 2;
}

.eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.2em;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-primary);
}

.subtitle {
  font-size: 1.05rem;
  line-height: 1.6;
}

.header-illustration {
  position: relative;
  width: 100%;
  height: clamp(200px, 30vw, 260px);
}

.orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(0px);
  opacity: 0.85;
}

.orb-primary {
  width: clamp(160px, 22vw, 220px);
  height: clamp(160px, 22vw, 220px);
  top: 10%;
  right: 15%;
  background: radial-gradient(circle at 30% 30%, #33bfff, rgba(0, 148, 255, 0.2));
}

.orb-secondary {
  width: clamp(180px, 26vw, 260px);
  height: clamp(180px, 26vw, 260px);
  bottom: -35%;
  left: -20%;
  background: radial-gradient(circle at 60% 40%, rgba(0, 148, 255, 0.3), transparent 65%);
}

.section {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  background: var(--color-surface);
  border-radius: var(--radius-xl);
  border: 1px solid var(--color-border);
  padding: clamp(1.5rem, 2vw, 2.5rem);
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

.section-header {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  justify-content: space-between;
  align-items: stretch;
}

.section-text h2 {
  font-size: clamp(1.75rem, 2.4vw, 2.25rem);
}

.section-text p {
  max-width: 520px;
}

.section-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
}

.section-header > :deep(.p-button) {
  align-self: flex-start;
}

.section-header :deep(.p-button-text) {
  color: var(--color-primary);
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.75rem;
  background: rgba(230, 245, 255, 0.6);
  border: 1px dashed rgba(0, 148, 255, 0.4);
  border-radius: var(--radius-lg);
  padding: 1.5rem;
  color: var(--color-text-secondary);
}

.empty-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.25rem 0.85rem;
  border-radius: var(--radius-pill);
  background: rgba(0, 148, 255, 0.12);
  color: var(--color-primary);
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.field { display: flex; flex-direction: column; gap: 0.5rem; }
.field-row { display: flex; align-items: center; gap: 0.75rem; }


.hidden-input {
  display: none;
}

.dialog-content {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.dialog-content label {
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--color-text-secondary);
}

.static-background-select {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.field-hint {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.checkbox-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.checkbox-row label {
  margin: 0;
  font-weight: 500;
  cursor: pointer;
}

@media (max-width: 960px) {
  .page-header {
    grid-template-columns: 1fr;
  }

  .header-illustration {
    display: none;
  }

  .section {
    padding: 1.5rem;
  }

  .section-header {
    gap: 1rem;
  }

  .section-actions {
    justify-content: flex-start;
  }
}
</style>
