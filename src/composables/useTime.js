import { ref, onMounted } from 'vue'

const time = ref('00:00')
const date = ref('周一 01')

function updateTime() {
  const now = new Date()
  time.value =
    now.getHours().toString().padStart(2, '0') +
    ':' +
    now.getMinutes().toString().padStart(2, '0')
  const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  date.value =
    days[now.getDay()] + ' ' + now.getDate().toString().padStart(2, '0')
}

export function useTime() {
  onMounted(() => {
    updateTime()
    setInterval(updateTime, 10000)
  })

  return { time, date }
}
