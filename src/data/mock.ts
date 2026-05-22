export type Macro = {
  calories: number
  protein: number
  carbs: number
  fat: number
}

export type Exercise = {
  id: string
  name: string
  muscle: string
  sets: number
  reps: number
  weight: number
  order: number
}

export const todayMacro: Macro = {
  calories: 1680,
  protein: 118,
  carbs: 186,
  fat: 48,
}

export const macroGoal: Macro = {
  calories: 2200,
  protein: 150,
  carbs: 240,
  fat: 70,
}

export const todayPlan = {
  weekday: "周五",
  title: "上肢力量",
  duration: "约 58 分钟",
  exercises: [
    { id: "bench", name: "杠铃卧推", muscle: "胸", sets: 4, reps: 8, weight: 70, order: 1 },
    { id: "row", name: "坐姿划船", muscle: "背", sets: 4, reps: 10, weight: 55, order: 2 },
    { id: "press", name: "哑铃肩推", muscle: "肩", sets: 3, reps: 10, weight: 22, order: 3 },
    { id: "curl", name: "哑铃弯举", muscle: "二头", sets: 3, reps: 12, weight: 14, order: 4 },
  ] satisfies Exercise[],
}

export const weeklyPlan = [
  { day: "周一", title: "下肢力量", count: 5 },
  { day: "周二", title: "休息", count: 0 },
  { day: "周三", title: "推", count: 6 },
  { day: "周四", title: "有氧", count: 2 },
  { day: "周五", title: "上肢力量", count: 4 },
  { day: "周六", title: "拉", count: 5 },
  { day: "周日", title: "休息", count: 0 },
]

export const recentMeals = [
  { id: "1", title: "早餐", note: "两个鸡蛋、燕麦、拿铁", calories: 520, protein: 31 },
  { id: "2", title: "午餐", note: "米饭、鸡胸肉、青菜", calories: 760, protein: 54 },
]

export const foodTrend = [
  { day: "一", calories: 2050, protein: 142 },
  { day: "二", calories: 2180, protein: 151 },
  { day: "三", calories: 1880, protein: 126 },
  { day: "四", calories: 2320, protein: 158 },
  { day: "五", calories: 1680, protein: 118 },
  { day: "六", calories: 0, protein: 0 },
  { day: "日", calories: 0, protein: 0 },
]

export const workoutHistory = [
  { id: "s1", date: "5月21日", title: "有氧", volume: "32 分钟", sets: 2 },
  { id: "s2", date: "5月19日", title: "推", volume: "7,840 kg", sets: 22 },
  { id: "s3", date: "5月17日", title: "拉", volume: "8,210 kg", sets: 24 },
]
