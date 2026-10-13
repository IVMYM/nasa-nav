<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

const THEME_KEY = 'zen-theme'
const SOURCE_KEY = 'zen-bg-source'
const TODO_KEY = 'zen-todos'
const WIDGET_KEY = 'zen-widgets-open'

const themes = [
  { id: 'ink', label: '墨韵' },
  { id: 'rice-paper', label: '宣纸' },
  { id: 'celadon', label: '青瓷' },
]

const engines = [
  { name: 'google', label: 'Google', placeholder: 'Google 搜索…', url: (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}` },
  { name: 'baidu', label: '百度', placeholder: '百度搜索…', url: (q) => `https://www.baidu.com/s?wd=${encodeURIComponent(q)}` },
  { name: 'bing', label: 'Bing', placeholder: 'Bing 搜索…', url: (q) => `https://www.bing.com/search?q=${encodeURIComponent(q)}` },
  { name: 'github', label: 'GitHub', placeholder: 'GitHub 搜索…', url: (q) => `https://github.com/search?q=${encodeURIComponent(q)}&type=repositories` },
  { name: 'site', label: '站内', placeholder: '筛选当前分类卡片…', url: () => '' },
]

const theme = ref(localStorage.getItem(THEME_KEY) || 'ink')
const source = ref(localStorage.getItem(SOURCE_KEY) || 'apod')
const site = ref(null)
const siteError = ref('')
const siteLoading = ref(true)
const activeMenu = ref('common')
const engine = ref(engines[0])
const query = ref('')
const bg = ref({ imageUrl: '', pageUrl: '', title: '', source: 'apod' })
const bgLoading = ref(false)
const bgError = ref('')
const poetry = ref(null)
const poetryError = ref('')
const widgetsOpen = ref(localStorage.getItem(WIDGET_KEY) !== '0')
const drawerOpen = ref(false)
const friendsOpen = ref(false)
const helpOpen = ref(false)
const todos = ref(loadTodos())
const todoDraft = ref('')
const searchEl = ref(null)

const menus = computed(() => site.value?.menus || [])
const activeLinks = computed(() => menus.value.find((menu) => menu.id === activeMenu.value)?.links || [])
const visibleLinks = computed(() => {
  const text = query.value.trim().toLowerCase()
  if (engine.value.name !== 'site' || !text) return activeLinks.value
  return activeLinks.value.filter((link) => link.title.toLowerCase().includes(text) || link.url.toLowerCase().includes(text))
})
const countdown = computed(() => {
  const target = site.value?.countdown_target
  if (!target?.date) return null
  const diff = new Date(target.date) - new Date()
  return {
    name: (target.name || '倒计时').trim() || '倒计时',
    date: target.date,
    days: Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24))),
  }
})
const overlay = computed(() => {
  if (theme.value === 'rice-paper') return 'linear-gradient(rgba(55, 42, 28, 0.36), rgba(35, 28, 20, 0.42))'
  if (theme.value === 'celadon') return 'linear-gradient(rgba(12, 38, 42, 0.44), rgba(8, 22, 28, 0.5))'
  return 'linear-gradient(rgba(8, 4, 18, 0.32), rgba(0, 0, 0, 0.36))'
})
const credit = computed(() => (source.value === 'gallery' ? 'NASA 图库' : 'NASA APOD'))

watch(theme, (value) => localStorage.setItem(THEME_KEY, value))
watch(source, (value) => localStorage.setItem(SOURCE_KEY, value))
watch(widgetsOpen, (value) => localStorage.setItem(WIDGET_KEY, value ? '1' : '0'))
watch(todos, (value) => localStorage.setItem(TODO_KEY, JSON.stringify(value)), { deep: true })

function loadTodos() {
  try {
    const raw = JSON.parse(localStorage.getItem(TODO_KEY) || '[]')
    return Array.isArray(raw) ? raw : []
  } catch {
    return []
  }
}

function favicon(url) {
  try {
    const host = new URL(url).hostname
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`
  } catch {
    return '/favicon.svg'
  }
}

async function loadSite() {
  siteLoading.value = true
  siteError.value = ''
  try {
    const response = await fetch('/api/site', { cache: 'no-store', headers: { Accept: 'application/json' } })
    if (!response.ok) throw new Error(`站点配置 HTTP ${response.status}`)
    site.value = await response.json()
    if (!menus.value.some((menu) => menu.id === activeMenu.value)) {
      activeMenu.value = menus.value[0]?.id || 'common'
    }
  } catch (error) {
    siteError.value = error.message || '导航加载失败'
  } finally {
    siteLoading.value = false
  }
}

async function loadBackground(next = source.value) {
  bgLoading.value = true
  bgError.value = ''
  const path = next === 'gallery' ? '/api/nasa/images/random' : '/api/apod/today'
  try {
    const response = await fetch(path, { cache: 'no-store' })
    if (!response.ok) throw new Error(next === 'gallery' ? 'NASA 图库加载失败，请稍后再试' : '每日天文加载失败，请稍后再试')
    const payload = await response.json()
    if (!payload?.imageUrl) throw new Error('没有可用图片')
    bg.value = payload
    source.value = next
  } catch (error) {
    bgError.value = error.message || '背景加载失败'
    if (next !== source.value) window.alert(error.message)
  } finally {
    bgLoading.value = false
  }
}

async function loadPoetry() {
  poetryError.value = ''
  try {
    const response = await fetch('/api/poetry')
    const payload = await response.json()
    if (!response.ok || payload.status === 'error') throw new Error(payload.errMessage || '诗词加载失败')
    poetry.value = payload.data
  } catch (error) {
    poetryError.value = error.message || '今日诗词暂时不可用'
  }
}

function search() {
  const text = query.value.trim()
  if (!text || engine.value.name === 'site') return
  window.open(engine.value.url(text), '_blank', 'noopener')
}

function addTodo() {
  const text = todoDraft.value.trim()
  if (!text) return
  todos.value.push({ id: Date.now(), text, done: false })
  todoDraft.value = ''
}

function onKeydown(event) {
  const tag = event.target?.tagName
  const typing = tag === 'INPUT' || tag === 'TEXTAREA'
  if (event.key === 'Escape') {
    drawerOpen.value = false
    friendsOpen.value = false
    helpOpen.value = false
    return
  }
  if (typing) return
  if (event.key === '/') {
    event.preventDefault()
    searchEl.value?.focus()
  } else if (event.key === 't') {
    drawerOpen.value = !drawerOpen.value
  } else if (event.key === 'd') {
    widgetsOpen.value = !widgetsOpen.value
  } else if (event.key === '?') {
    helpOpen.value = true
  } else if (/^[1-9]$/.test(event.key)) {
    const link = visibleLinks.value[Number(event.key) - 1]
    if (link) window.open(link.url, '_blank', 'noopener')
  }
}

onMounted(() => {
  loadSite()
  loadBackground(source.value)
  loadPoetry()
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div class="nav-root" :class="`theme-${theme}`">
    <div class="nav-bg" :class="{ 'nav-bg--apod': !!bg.imageUrl }" aria-hidden="true">
      <img v-if="bg.imageUrl" class="nav-bg__photo" :src="bg.imageUrl" alt="" />
      <div v-if="bg.imageUrl" class="nav-bg__overlay" :style="{ backgroundImage: overlay }" />
    </div>

    <header class="nav-menubar-fixed nav-z">
      <nav class="menu-bar" aria-label="导航分类">
        <button
          v-for="menu in menus"
          :key="menu.id"
          type="button"
          :class="{ active: activeMenu === menu.id }"
          @click="activeMenu = menu.id"
        >
          {{ menu.name }}
        </button>
      </nav>
    </header>

    <main class="nav-main nav-z">
      <section class="search-section">
        <div class="search-box-wrapper">
          <div class="search-engine-select" role="tablist" aria-label="搜索引擎">
            <button
              v-for="item in engines"
              :key="item.name"
              type="button"
              class="engine-btn"
              :class="{ active: engine.name === item.name }"
              @click="engine = item"
            >
              {{ item.label }}
            </button>
          </div>
          <form class="search-container" @submit.prevent="search">
            <input
              ref="searchEl"
              v-model="query"
              class="search-input-nav"
              :placeholder="engine.placeholder"
              aria-label="搜索"
            />
            <button v-if="query" type="button" class="clear-btn-nav" aria-label="清空" @click="query = ''">×</button>
            <button type="submit" class="search-btn-nav" aria-label="搜索">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2" />
                <path d="M20 20l-3.5-3.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
              </svg>
            </button>
          </form>
        </div>
      </section>

      <div class="content-wrapper">
        <section class="main-content">
          <p v-if="siteLoading" class="text-center text-white/50 text-sm">导航加载中…</p>
          <p v-else-if="siteError" class="bg-error">{{ siteError }}</p>
          <p v-else-if="!visibleLinks.length" class="text-white/40 text-center text-sm py-2">这个分类还没有链接</p>
          <div v-else class="nav-card-grid">
            <a
              v-for="(link, index) in visibleLinks"
              :key="link.url + link.title"
              class="link-item"
              :href="link.url"
              target="_blank"
              rel="noopener noreferrer"
              :data-filter-idx="index"
            >
              <span class="link-item-inner">
                <img class="link-icon" :src="favicon(link.url)" alt="" />
                <span class="link-text">{{ link.title }}</span>
              </span>
            </a>
          </div>

          <div
            v-if="site && (site.show_poetry || site.show_countdown || site.show_todo)"
            class="nav-widgets-wrap"
            :data-widget-anim="site.widget_animation || 'zoom'"
          >
            <div class="nav-widgets-panel__header">
              <span class="nav-widgets-panel__title">今日</span>
              <button
                type="button"
                class="nav-widgets-panel__toggle"
                :aria-expanded="widgetsOpen"
                @click="widgetsOpen = !widgetsOpen"
              >
                {{ widgetsOpen ? '收起' : '展开' }}
              </button>
            </div>
            <div class="nav-widgets-panel__body" :class="{ 'nav-widgets-panel__body--collapsed': !widgetsOpen }">
              <div class="nav-widgets">
                <article v-if="site.show_poetry" class="nav-widget-card">
                  <h3>今日诗词</h3>
                  <div v-if="poetry" class="text-center text-white/90 text-sm leading-relaxed font-serif">
                    <p class="mb-1">{{ poetry.content }}</p>
                    <p class="text-white/50 text-xs">{{ poetry.origin?.dynasty }} · {{ poetry.origin?.author }}《{{ poetry.origin?.title }}》</p>
                  </div>
                  <p v-else class="text-white/40 text-center text-sm py-2">{{ poetryError || '诗词加载中…' }}</p>
                </article>

                <article v-if="site.show_countdown" class="nav-widget-card">
                  <h3>{{ countdown?.name || '倒计时' }}</h3>
                  <div v-if="countdown" class="text-center">
                    <p class="countdown-days-line">
                      <span class="countdown-days-num">{{ countdown.days }}</span>
                      <span class="countdown-days-unit">天</span>
                    </p>
                    <p class="text-white/50 text-xs mt-1">{{ countdown.date }}</p>
                  </div>
                  <p v-else class="text-white/40 text-center text-sm py-2">未设置目标</p>
                </article>

                <article v-if="site.show_todo" class="nav-widget-card">
                  <h3>待办</h3>
                  <div class="space-y-2">
                    <label v-for="item in todos" :key="item.id" class="todo-row" :class="{ done: item.done }">
                      <input v-model="item.done" type="checkbox" />
                      <span>{{ item.text }}</span>
                      <button type="button" aria-label="删除" @click="todos = todos.filter((todo) => todo.id !== item.id)">×</button>
                    </label>
                    <p v-if="!todos.length" class="text-white/40 text-sm">还没有待办</p>
                  </div>
                  <form class="todo-form" @submit.prevent="addTodo">
                    <input v-model="todoDraft" placeholder="记一件事" aria-label="新待办" />
                    <button type="submit">添加</button>
                  </form>
                </article>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>

    <footer class="nav-footer nav-z">
      <p v-if="bg.imageUrl" class="nav-apod-credit">
        <a class="nav-apod-link" :href="bg.pageUrl || 'https://science.nasa.gov/apod/'" target="_blank" rel="noopener noreferrer">
          每日背景 · {{ credit }}
          <span v-if="bg.title" class="nav-apod-title"> — {{ bg.title }}</span>
        </a>
      </p>
      <p v-if="bgError" class="bg-error">{{ bgError }}</p>
      <div class="footer-content">
        <button type="button" class="friend-link-btn" @click="friendsOpen = true">友情链接</button>
        <p class="copyright">Copyright © 2026 Zen Glass | 墨韵琉璃 · 个人导航</p>
        <div class="footer-actions">
          <button type="button" class="nav-ghost-btn" @click="drawerOpen = true">背景与主题</button>
          <button type="button" class="nav-ghost-btn" @click="helpOpen = true">快捷键</button>
        </div>
      </div>
    </footer>

    <div v-if="drawerOpen" class="bg-drawer-overlay" @click.self="drawerOpen = false">
      <aside class="bg-drawer" role="dialog" aria-labelledby="bg-drawer-title">
        <div class="bg-drawer__header">
          <h3 id="bg-drawer-title">背景与主题</h3>
          <button type="button" class="close-btn-nav" aria-label="关闭" @click="drawerOpen = false">×</button>
        </div>
        <div class="bg-drawer__body">
          <p class="bg-drawer__section-label">NASA 背景来源</p>
          <div class="bg-drawer__options">
            <button type="button" class="bg-drawer__option" :class="{ active: source === 'apod' }" :disabled="bgLoading" @click="loadBackground('apod')">
              <span class="bg-drawer__option-title">每日天文</span>
              <span class="bg-drawer__option-desc">APOD · 官方每日一图（高清）</span>
            </button>
            <button type="button" class="bg-drawer__option" :class="{ active: source === 'gallery' }" :disabled="bgLoading" @click="loadBackground('gallery')">
              <span class="bg-drawer__option-title">NASA 图库</span>
              <span class="bg-drawer__option-desc">images.nasa.gov · 随机高清航天图</span>
            </button>
          </div>
          <p v-if="bgLoading" class="bg-drawer__status">加载中…</p>
          <p class="bg-drawer__section-label mt-4">界面强调色</p>
          <div class="bg-drawer__themes">
            <button
              v-for="item in themes"
              :key="item.id"
              type="button"
              class="bg-drawer__theme-chip"
              :class="{ active: theme === item.id }"
              @click="theme = item.id"
            >
              {{ item.label }}
            </button>
          </div>
        </div>
      </aside>
    </div>

    <div v-if="friendsOpen" class="modal-overlay-nav" role="dialog" aria-modal="true" @click.self="friendsOpen = false">
      <div class="modal-content-nav">
        <div class="modal-header-nav">
          <h3>友情链接</h3>
          <button type="button" class="close-btn-nav" aria-label="关闭" @click="friendsOpen = false">×</button>
        </div>
        <div class="modal-body-nav">
          <div class="friend-links-grid">
            <a
              v-for="link in site?.friend_links || []"
              :key="link.url"
              class="friend-link-card"
              :href="link.url"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span class="friend-link-logo"><img :src="favicon(link.url)" alt="" /></span>
              <span class="friend-link-info"><h4>{{ link.title }}</h4></span>
            </a>
          </div>
          <p v-if="!(site?.friend_links || []).length" class="text-center">还没有友情链接</p>
        </div>
      </div>
    </div>

    <div v-if="helpOpen" class="modal-overlay-nav" role="dialog" aria-modal="true" @click.self="helpOpen = false">
      <div class="modal-content-nav" style="max-width: 26rem; width: 100%">
        <div class="modal-header-nav">
          <h3>键盘快捷键</h3>
          <button type="button" class="close-btn-nav" aria-label="关闭" @click="helpOpen = false">×</button>
        </div>
        <div class="modal-body-nav">
          <div class="shortcuts-list">
            <div class="row"><span>/</span><span>聚焦搜索框</span></div>
            <div class="row"><span>1–9</span><span>打开当前分类下第 1–9 个卡片</span></div>
            <div class="row"><span>t</span><span>打开背景与主题抽屉</span></div>
            <div class="row"><span>d</span><span>展开或收起小部件栏</span></div>
            <div class="row"><span>?</span><span>打开此说明</span></div>
            <div class="row"><span>Esc</span><span>关闭弹窗</span></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
