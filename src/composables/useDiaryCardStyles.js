import { ref, watch } from 'vue'

const KEY = 'diaryCardStylePresets'

const defaultPresets = [
  { 
    id: 'diary_preset_wechat', 
    name: '微信读书风', 
    layout: 'wechat',
    css: `
@import url("https://fontsapi.zeoseven.com/256/main/result.css");
@import url("https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@300;400;700;900&display=swap");
.wx-page, .wx-page * { font-family: "Noto Serif SC", serif !important; }
.wx-page { background-color: #FFFFFF; width: 340px; border-radius: 4px; box-shadow: 0 20px 40px rgba(0,0,0,0.06); padding: 40px 30px; display: flex; flex-direction: column; }
.wx-header { display: flex; flex-direction: column; align-items: flex-start; margin-bottom: 24px; }
.wx-avatar { width: 36px; height: 36px; border-radius: 50%; background-color: #FAFAFA; border: 1px solid rgba(0,0,0,0.1); margin-bottom: 12px; background-size: cover; background-position: center; }
.wx-user-name { font-family: "Noto Serif SC", serif !important; font-weight: 700; font-size: 0.9rem; color: #111; letter-spacing: 0.05em; margin-bottom: 4px; }
.wx-date { font-family: "Noto Serif SC", serif !important; font-weight: 300; font-size: 0.75rem; color: #999; letter-spacing: 0.08em; }
.wx-divider { width: 100%; height: 1px; background-color: rgba(0,0,0,0.06); margin-bottom: 30px; }
.wx-content { font-family: "Huiwen-mincho", serif !important; font-size: 1rem; line-height: 2.2; color: #383838; letter-spacing: 0.05em; text-align: justify; white-space: pre-wrap; }
.wx-footer { margin-top: 40px; display: flex; flex-direction: column; gap: 8px; font-family: "Noto Serif SC", serif !important; }
.wx-source { font-weight: 300; font-size: 0.85rem; color: #999; letter-spacing: 0.04em; display: flex; align-items: baseline; }
.wx-slash { color: #D4D4D4; margin-right: 6px; font-size: 1rem; }
.wx-char-name { font-weight: 900; font-size: 1.2rem; color: #111; letter-spacing: 0.02em; display: flex; align-items: center; gap: 8px; }
.wx-tag { font-size: 0.7rem; font-weight: 400; color: #bbb; }
`
  },
  { 
    id: 'diary_preset_calendar', 
    name: '锐利日历', 
    layout: 'calendar',
    css: `
@import url("https://fontsapi.zeoseven.com/875/main/result.css");
@import url("https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500&family=Noto+Sans+SC:wght@300;400&family=Playfair+Display:ital,wght@0,600;0,900;1,600&display=swap");
.cal-square, .cal-square * { font-family: "ChillHuoSong_F", "Noto Serif SC", serif !important; }
.cal-square { background-color: #FCFCFC; width: 340px; border-radius: 4px; box-shadow: 0 30px 60px rgba(0,0,0,0.08), inset 0 0 0 1px rgba(255,255,255,0.8); padding: 40px 24px; display: flex; flex-direction: column; align-items: center; text-align: center; }
.cal-time { display: flex; flex-direction: column; align-items: center; margin-bottom: 24px; }
.cal-date-num { font-family: "Playfair Display", serif !important; font-size: 5.5rem; font-weight: 600; line-height: 1; color: #151515; margin-bottom: 4px; }
.cal-month { font-family: "Montserrat", sans-serif !important; font-size: 0.8rem; font-weight: 500; text-transform: uppercase; letter-spacing: 0.3em; color: #151515; margin-bottom: 8px; margin-left: 0.3em; }
.cal-tag { font-family: "Noto Sans SC", sans-serif !important; font-size: 0.75rem; font-weight: 300; color: #8E8E8E; letter-spacing: 0.15em; }
.cal-divider { display: flex; flex-direction: column; align-items: center; margin: 16px 0 30px 0; gap: 12px; }
.cal-dot { width: 4px; height: 4px; border-radius: 50%; background-color: #9E1B1B; }
.cal-line { width: 30px; height: 1px; background-color: rgba(0,0,0,0.2); }
.cal-content { font-family: "ChillHuoSong_F", "Noto Serif SC", serif !important; font-size: 1.05rem; line-height: 1.95; color: #2C2C2C; letter-spacing: 0.05em; text-align: center; margin-bottom: 40px; white-space: pre-wrap; }
.cal-footer { display: flex; flex-direction: column; align-items: center; gap: 8px; font-family: "ChillHuoSong_F", "Noto Serif SC", serif !important; }
.cal-title { font-weight: normal; font-size: 0.9rem; color: #8E8E8E; letter-spacing: 0.08em; }
.cal-title::before, .cal-title::after { content: ' — '; opacity: 0.4; margin: 0 6px; font-family: "Montserrat", sans-serif !important; }
.cal-char-name { font-weight: normal; font-size: 1.1rem; color: #151515; letter-spacing: 0.05em; }
`
  },
  { 
    id: 'diary_preset_letter', 
    name: '朱丝栏信笺', 
    layout: 'letter',
    css: `
@import url("https://fontsapi.zeoseven.com/104/main/result.css");
:root {
  --paper-color: #F5F0E6;
  --red-ink: rgba(180, 60, 60, 0.45);
  --red-border: #A64B4B;
  --text-ink: #1C2430;
  --line-height: 32px;
  --font-handwriting: "JasonHandwriting5", "Kaiti SC", STKaiti, serif;
}
.letter-paper, .letter-paper * { font-family: var(--font-handwriting) !important; }
.letter-paper {
  background-color: var(--paper-color);
  width: 340px;
  position: relative;
  box-shadow:
    0 20px 40px rgba(0, 0, 0, 0.4),
    0 1px 5px rgba(0, 0, 0, 0.2),
    inset 0 0 40px rgba(0, 0, 0, 0.02);
  padding: 24px 20px;
}
.letter-grid {
  width: 100%;
  border: 1px solid var(--red-border);
  position: relative;
  background-image: repeating-linear-gradient(
    transparent,
    transparent calc(var(--line-height) - 1px),
    var(--red-ink) calc(var(--line-height) - 1px),
    var(--red-ink) var(--line-height)
  );
  background-size: 100% var(--line-height);
  background-position: 0 0;
  padding: var(--line-height) 20px calc(var(--line-height) * 2) 20px;
}
.letter-text {
  font-family: var(--font-handwriting) !important;
  font-size: 1.2rem;
  color: var(--text-ink);
  line-height: var(--line-height);
  letter-spacing: 0.05em;
  transform: translateY(4px);
}
.letter-salutation { margin-bottom: var(--line-height); }
.letter-body { text-align: justify; white-space: pre-wrap; margin-bottom: var(--line-height); }
.letter-body p { text-indent: 2em; margin-bottom: var(--line-height); }
.letter-sign { margin-top: var(--line-height); display: flex; flex-direction: column; align-items: flex-end; }
.letter-sig-name { font-size: 1.45rem; margin-bottom: -4px; margin-right: 12px; transform: rotate(-2deg); }
.letter-sig-date { font-size: 1.05rem; opacity: 0.85; }
`
  },
  { 
    id: 'diary_preset_magazine', 
    name: '杂志每日一记', 
    layout: 'magazine',
    css: `
@import url("https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600&family=Noto+Serif+SC:wght@400;600&display=swap");
.mag-card, .mag-card * { font-family: "Noto Serif SC", serif !important; }
.mag-card { background-color: #FFFFFF; width: 340px; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.08); display: flex; flex-direction: column; }
.mag-cover { width: 100%; height: 220px; background-size: cover; background-position: center; position: relative; display: flex; flex-direction: column; padding: 20px; }
.mag-cover::before { content: ''; position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.1) 100%); z-index: 1; }
.mag-top-bar { position: relative; z-index: 2; display: flex; justify-content: space-between; align-items: center; font-family: "Montserrat", sans-serif !important; }
.mag-tag { font-size: 0.65rem; font-weight: 600; color: #FFF; letter-spacing: 0.15em; text-transform: uppercase; background: rgba(255,255,255,0.2); backdrop-filter: blur(4px); padding: 4px 10px; border-radius: 100px; }
.mag-date { font-size: 0.7rem; color: rgba(255,255,255,0.9); letter-spacing: 0.1em; }
.mag-content { padding: 30px 24px; position: relative; }
.mag-text { font-family: "Noto Serif SC", serif !important; font-weight: 600; font-size: 1rem; line-height: 1.8; color: #222; letter-spacing: 0.02em; text-align: justify; margin-bottom: 24px; white-space: pre-wrap; }
.mag-dropcap { float: left; font-size: 3.4rem; font-weight: 400; line-height: 0.8; padding-top: 4px; padding-right: 10px; padding-bottom: 4px; color: #D96C4A; font-family: "Noto Serif SC", serif !important; }
.mag-divider { width: 100%; height: 1px; background-color: rgba(0,0,0,0.08); margin-bottom: 20px; }
.mag-footer { display: flex; flex-direction: column; gap: 4px; font-family: "Montserrat", sans-serif !important; }
.mag-author { font-size: 0.85rem; font-weight: 600; color: #222; letter-spacing: 0.05em; }
.mag-title { font-size: 0.7rem; color: #8C8C8C; letter-spacing: 0.02em; font-style: italic; }
`
  },
  { 
    id: 'diary_preset_pixel', 
    name: '像素游戏框', 
    layout: 'pixel',
    css: `
@import url("https://fontsapi.zeoseven.com/2001/main/result.css");
.pix-panel, .pix-panel * { font-family: "ZhengGeDianHei 16", "PingFang SC", sans-serif !important; }
.pix-panel { position: relative; border: 4px solid #5D4037; background-color: #FF9800; padding: 6px; border-radius: 16px; width: 340px; -webkit-font-smoothing: none; }
.pix-inner { background-color: #FFF8E1; border-radius: 8px; padding: 16px; display: flex; flex-direction: column; }
.pix-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 12px; }
.pix-header-main { display: flex; align-items: center; gap: 12px; }
.pix-avatar { width: 56px; height: 56px; background-color: #FFF3E0; border: 3px solid #5D4037; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; overflow: hidden; background-size: cover; background-position: center; }
.pix-avatar svg { width: 32px; height: 32px; fill: #5D4037; }
.pix-title { font-size: 20px; color: #212121; line-height: 1.2; text-shadow: 1px 0 0 #212121; }
.pix-btn-close { width: 28px; height: 28px; background-color: #F44336; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid #5D4037; flex-shrink: 0; }
.pix-btn-close svg { width: 14px; height: 14px; stroke: #FFFFFF; stroke-width: 3; stroke-linecap: round; }
.pix-divider { height: 2px; background-color: #FF9800; opacity: 0.5; margin-bottom: 16px; border-radius: 1px; }
.pix-body { color: #4E342E; font-size: 16px; line-height: 1.7; margin-bottom: 24px; white-space: pre-wrap; }
.pix-footer { display: flex; justify-content: flex-end; gap: 10px; }
.pix-action { font-size: 16px; color: #4E342E; background-color: #FFEB3B; border: 3px dotted #F57F17; border-radius: 10px; padding: 6px 18px; font-family: inherit; }
`
  },
  { 
    id: 'diary_preset_journal', 
    name: '活页打孔手账', 
    layout: 'journal',
    css: `
@import url("https://fontsapi.zeoseven.com/120/main/result.css");
.journal-paper, .journal-paper * { font-family: "CEF Fonts CJK Mono", monospace !important; }
.journal-paper { background-color: #E6E4DD; width: 340px; position: relative; box-shadow: 15px 15px 0px rgba(0,0,0,0.3), inset 0 0 40px rgba(0,0,0,0.04); padding: 40px 24px 50px 56px; -webkit-font-smoothing: none; }
.journal-paper::before { content: ''; position: absolute; top: 0; left: 0; bottom: 0; width: 28px; border-right: 1px solid rgba(26,26,26,0.2); background-image: radial-gradient(circle at 14px 20px, rgba(0,0,0,0.5) 5px, transparent 6px); background-size: 28px 40px; background-repeat: repeat-y; }
.journal-header { text-align: center; margin-bottom: 40px; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.journal-title { font-size: 1.35rem; color: #1A1A1A; letter-spacing: 0.1em; }
.journal-date { font-size: 0.95rem; color: #555555; letter-spacing: 0.05em; }
.journal-body { color: #1A1A1A; font-size: 1.05rem; line-height: 1.85; text-align: justify; white-space: pre-wrap; }
`
  },
  { 
    id: 'diary_preset_profile', 
    name: '微缩口袋名片', 
    layout: 'profile',
    css: `
@import url("https://fontsapi.zeoseven.com/79/main/result.css");
.profile-card, .profile-card * { font-family: "Clear Han Serif", serif !important; }
.profile-card { background-color: #FFFFFF; width: 340px; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(42,45,52,0.05); display: flex; flex-direction: column; position: relative; }
.card-banner { width: 100%; height: 100px; background: linear-gradient(135deg, #A1B5D8 0%, #E4D5D3 100%); position: relative; background-image: linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(0,0,0,0.05) 100%), radial-gradient(rgba(255,255,255,0.1) 1px, transparent 1px); background-size: cover, 10px 10px; }
.banner-icon { position: absolute; top: 16px; right: 16px; width: 16px; height: 16px; fill: #FFFFFF; opacity: 0.6; }
.profile-avatar-container { width: 80px; height: 80px; border-radius: 50%; margin: -40px auto 0 auto; position: relative; z-index: 10; background-color: #FFFFFF; padding: 4px; box-shadow: 0 8px 16px rgba(0,0,0,0.04); }
.profile-avatar-inner { width: 100%; height: 100%; border-radius: 50%; background-size: cover; background-position: center; background-color: #EAEAEA; display: flex; align-items: center; justify-content: center; }
.profile-avatar-inner svg { width: 45%; height: 45%; fill: #FFF; opacity: 0.8; }
.profile-info { text-align: center; padding: 12px 24px 0 24px; }
.profile-name { font-size: 1.4rem; color: #2A2D34; letter-spacing: 0.05em; margin-bottom: 4px; font-weight: bold; }
.profile-bio { font-size: 0.85rem; color: #6B7280; letter-spacing: 0.06em; line-height: 1.4; font-style: italic; }
.profile-stats { display: flex; justify-content: center; align-items: center; gap: 20px; margin-top: 16px; padding-bottom: 16px; }
.stat-item { display: flex; flex-direction: column; align-items: center; gap: 2px; }
.stat-number { font-size: 1.1rem; color: #2A2D34; font-weight: bold; }
.stat-label { font-family: sans-serif !important; font-size: 0.55rem; color: #6B7280; letter-spacing: 0.1em; text-transform: uppercase; opacity: 0.7; }
.stat-divider { width: 1px; height: 16px; background-color: #C1C1C8; opacity: 0.3; }
.profile-action { display: flex; justify-content: center; margin-bottom: 24px; }
.btn-follow { padding: 6px 24px; border: 1px solid #C1C1C8; border-radius: 16px; background: transparent; font-family: "Clear Han Serif", serif !important; font-size: 0.8rem; color: #2A2D34; letter-spacing: 0.08em; display: flex; align-items: center; gap: 4px; }
.btn-follow svg { width: 12px; height: 12px; fill: #2A2D34; }
.profile-divider { padding: 0 24px; margin-bottom: 24px; }
.profile-divider div { width: 100%; height: 1px; background: linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.05) 50%, transparent 100%); }
.profile-body { padding: 0 24px; font-size: 0.95rem; line-height: 1.7; color: #4B5563; letter-spacing: 0.03em; text-align: justify; white-space: pre-wrap; }
.profile-footer { padding: 24px 24px 20px 24px; display: flex; justify-content: space-between; align-items: center; font-size: 0.6rem; color: #C1C1C8; letter-spacing: 0.06em; font-family: sans-serif !important; text-transform: uppercase; opacity: 0.5; }
.profile-tags { display: flex; gap: 8px; }
.profile-tag-item { display: flex; align-items: center; gap: 3px; }
.profile-tag-item::before { content: ''; display: block; width: 2px; height: 2px; border-radius: 50%; background-color: #C1C1C8; }
`
  }
]

const migratePresets = (stored, defaults) => {
  const defaultMap = new Map(defaults.map(p => [p.id, p]))
  const result = []
  stored.forEach(p => {
    if (defaultMap.has(p.id)) {
      result.push({ ...defaultMap.get(p.id) })
    } else {
      result.push(p)
    }
  })
  defaults.forEach(def => {
    if (!stored.find(p => p.id === def.id)) result.push(def)
  })
  return result
}

const load = (key, def) => {
  const s = localStorage.getItem(key)
  if (s) {
    const parsed = JSON.parse(s)
    if (parsed.length > 0) return migratePresets(parsed, def)
  }
  return def
}

const presets = ref(load(KEY, defaultPresets))

watch(presets, (v) => localStorage.setItem(KEY, JSON.stringify(v)), { deep: true })

export function useDiaryCardStyles() {
  const addPreset = (name, layout, css) => {
    const id = 'diary_preset_' + Date.now()
    presets.value.push({ id, name, layout: layout || 'default', css })
    return id
  }

  const updatePreset = (id, updates) => {
    const p = presets.value.find(i => i.id === id)
    if (p) Object.assign(p, updates)
  }

  const deletePreset = (id) => {
    presets.value = presets.value.filter(p => p.id !== id)
  }

  const getPresetById = (id) => {
    return presets.value.find(p => p.id === id) || null
  }

  const exportPresets = () => JSON.stringify(presets.value, null, 2)

  const importPresets = (jsonStr) => {
    try {
      const data = JSON.parse(jsonStr)
      if (Array.isArray(data)) {
        presets.value.push(...data)
        return true
      }
      return false
    } catch (e) {
      return false
    }
  }

  return { presets, addPreset, updatePreset, deletePreset, getPresetById, exportPresets, importPresets }
}

