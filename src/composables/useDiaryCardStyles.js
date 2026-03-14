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
.wx-page { background-color: #FFFFFF; width: 340px; border-radius: 4px; box-shadow: 0 20px 40px rgba(0,0,0,0.06); padding: 40px 30px; display: flex; flex-direction: column; }
.wx-header { display: flex; flex-direction: column; align-items: flex-start; margin-bottom: 24px; }
.wx-avatar { width: 36px; height: 36px; border-radius: 50%; background-color: #FAFAFA; border: 1px solid rgba(0,0,0,0.1); margin-bottom: 12px; background-size: cover; background-position: center; }
.wx-user-name { font-family: "Noto Serif SC", serif; font-weight: 700; font-size: 0.9rem; color: #111; letter-spacing: 0.05em; margin-bottom: 4px; }
.wx-date { font-family: "Noto Serif SC", serif; font-weight: 300; font-size: 0.75rem; color: #999; letter-spacing: 0.08em; }
.wx-divider { width: 100%; height: 1px; background-color: rgba(0,0,0,0.06); margin-bottom: 30px; }
.wx-content { font-family: "Huiwen-mincho", serif; font-size: 1rem; line-height: 2.2; color: #383838; letter-spacing: 0.05em; text-align: justify; white-space: pre-wrap; }
.wx-footer { margin-top: 40px; display: flex; flex-direction: column; gap: 8px; font-family: "Noto Serif SC", serif; }
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
.cal-square { background-color: #FCFCFC; width: 340px; border-radius: 4px; box-shadow: 0 30px 60px rgba(0,0,0,0.08), inset 0 0 0 1px rgba(255,255,255,0.8); padding: 40px 24px; display: flex; flex-direction: column; align-items: center; text-align: center; }
.cal-time { display: flex; flex-direction: column; align-items: center; margin-bottom: 24px; }
.cal-date-num { font-family: "Playfair Display", serif; font-size: 5.5rem; font-weight: 600; line-height: 1; color: #151515; margin-bottom: 4px; }
.cal-month { font-family: "Montserrat", sans-serif; font-size: 0.8rem; font-weight: 500; text-transform: uppercase; letter-spacing: 0.3em; color: #151515; margin-bottom: 8px; margin-left: 0.3em; }
.cal-tag { font-family: "Noto Sans SC", sans-serif; font-size: 0.75rem; font-weight: 300; color: #8E8E8E; letter-spacing: 0.15em; }
.cal-divider { display: flex; flex-direction: column; align-items: center; margin: 16px 0 30px 0; gap: 12px; }
.cal-dot { width: 4px; height: 4px; border-radius: 50%; background-color: #9E1B1B; }
.cal-line { width: 30px; height: 1px; background-color: rgba(0,0,0,0.2); }
.cal-content { font-family: "ChillHuoSong_F", "Noto Serif SC", serif; font-size: 1.05rem; line-height: 1.95; color: #2C2C2C; letter-spacing: 0.05em; text-align: center; margin-bottom: 40px; white-space: pre-wrap; }
.cal-footer { display: flex; flex-direction: column; align-items: center; gap: 8px; font-family: "ChillHuoSong_F", "Noto Serif SC", serif; }
.cal-title { font-weight: normal; font-size: 0.9rem; color: #8E8E8E; letter-spacing: 0.08em; }
.cal-title::before, .cal-title::after { content: ' — '; opacity: 0.4; margin: 0 6px; font-family: "Montserrat", sans-serif; }
.cal-char-name { font-weight: normal; font-size: 1.1rem; color: #151515; letter-spacing: 0.05em; }
`
  },
  { 
    id: 'diary_preset_letter', 
    name: '朱丝栏信笺', 
    layout: 'letter',
    css: `
@font-face { font-family: 'CustomLetterFont'; src: url('https://files.catbox.moe/wj9hrt.ttf') format('truetype'); }
.letter-paper { background-color: #F5F0E6; width: 340px; box-shadow: 0 16px 30px rgba(0,0,0,0.2); padding: 20px 16px; position: relative; }
.letter-grid { width: 100%; border: 1px solid #A64B4B; background-image: repeating-linear-gradient(transparent, transparent 31px, rgba(180,60,60,0.45) 31px, rgba(180,60,60,0.45) 32px); background-size: 100% 32px; padding: 32px 16px 64px 16px; }
.letter-text { font-family: "CustomLetterFont", "Kaiti SC", STKaiti, serif; font-size: 1.35rem; color: #1C2430; line-height: 32px; letter-spacing: 0.05em; transform: translateY(4px); }
.letter-salutation { margin-bottom: 32px; }
.letter-body { text-indent: 2em; text-align: justify; white-space: pre-wrap; margin-bottom: 32px; }
.letter-sign { display: flex; flex-direction: column; align-items: flex-end; margin-top: 32px; }
.letter-sig-name { font-size: 1.5rem; margin-bottom: -4px; margin-right: 8px; transform: rotate(-2deg); }
.letter-sig-date { font-size: 1.1rem; opacity: 0.85; }
`
  },
  { 
    id: 'diary_preset_magazine', 
    name: '杂志每日一记', 
    layout: 'magazine',
    css: `
@import url("https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600&family=Noto+Serif+SC:wght@400;600&display=swap");
.mag-card { background-color: #FFFFFF; width: 340px; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.08); display: flex; flex-direction: column; }
.mag-cover { width: 100%; height: 220px; background-size: cover; background-position: center; position: relative; display: flex; flex-direction: column; padding: 20px; }
.mag-cover::before { content: ''; position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.1) 100%); z-index: 1; }
.mag-top-bar { position: relative; z-index: 2; display: flex; justify-content: space-between; align-items: center; font-family: "Montserrat", sans-serif; }
.mag-tag { font-size: 0.65rem; font-weight: 600; color: #FFF; letter-spacing: 0.15em; text-transform: uppercase; background: rgba(255,255,255,0.2); backdrop-filter: blur(4px); padding: 4px 10px; border-radius: 100px; }
.mag-date { font-size: 0.7rem; color: rgba(255,255,255,0.9); letter-spacing: 0.1em; }
.mag-content { padding: 30px 24px; position: relative; }
.mag-text { font-family: "Noto Serif SC", serif; font-weight: 600; font-size: 1rem; line-height: 1.8; color: #222; letter-spacing: 0.02em; text-align: justify; margin-bottom: 24px; white-space: pre-wrap; }
.mag-text::first-letter { float: left; font-size: 3.4rem; font-weight: 400; line-height: 0.8; padding-top: 4px; padding-right: 10px; padding-bottom: 4px; color: #D96C4A; font-family: "Noto Serif SC", serif; }
.mag-divider { width: 100%; height: 1px; background-color: rgba(0,0,0,0.08); margin-bottom: 20px; }
.mag-footer { display: flex; flex-direction: column; gap: 4px; font-family: "Montserrat", sans-serif; }
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
.pix-panel { position: relative; border: 4px solid #5D4037; background-color: #FF9800; padding: 6px; border-radius: 16px; width: 340px; font-family: "ZhengGeDianHei 16", "PingFang SC", sans-serif; -webkit-font-smoothing: none; }
.pix-inner { background-color: #FFF8E1; border-radius: 8px; padding: 16px; display: flex; flex-direction: column; }
.pix-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 12px; }
.pix-header-main { display: flex; align-items: center; gap: 12px; }
.pix-avatar { width: 56px; height: 56px; background-color: #FFF3E0; border: 3px solid #5D4037; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; overflow: hidden; }
.pix-avatar svg { width: 32px; height: 32px; fill: #5D4037; }
.pix-avatar-img { width: 100%; height: 100%; background-size: cover; background-position: center; }
.pix-title { font-size: 20px; color: #212121; line-height: 1.2; text-shadow: 1px 0 0 #212121; }
.pix-btn-close { width: 28px; height: 28px; background-color: #F44336; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid #5D4037; flex-shrink: 0; }
.pix-btn-close svg { width: 14px; height: 14px; stroke: #FFFFFF; stroke-width: 3; stroke-linecap: round; }
.pix-divider { height: 2px; background-color: #FF9800; opacity: 0.5; margin-bottom: 16px; border-radius: 1px; }
.pix-body { color: #4E342E; font-size: 16px; line-height: 1.7; margin-bottom: 24px; white-space: pre-wrap; }
.pix-footer { display: flex; justify-content: flex-end; gap: 10px; }
.pix-action { font-size: 16px; color: #4E342E; background-color: #FFEB3B; border: 3px dotted #F57F17; border-radius: 10px; padding: 6px 18px; }
`
  }
]

const load = (key, def) => {
  const s = localStorage.getItem(key)
  if (s) {
    const parsed = JSON.parse(s)
    if (parsed.length > 0) return parsed
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
