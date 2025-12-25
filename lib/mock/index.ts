export const mockTaskPlan = {
  "planId": "plan_g3_reorder_02",
  "duration": 2700,
  "name": "先句后词挑战",
  "phases": [
    {
      "desc": "专注背诵5个句子",
      "duration": 10,
      "endText": "句子背完啦，快休息一下，准备迎接单词！",
      "id": "phase_new_01",
      "name": "句子通关",
      "startText": "好哒，那我们先用20分钟攻克这5个句子，大声读出来！",
      "type": 1 // 1 是专注 2 休息
    },
    {
      "desc": "休息10分钟",
      "duration": 10,
      "endText": "休息结束，回来背单词啦！",
      "id": "phase_new_02",
      "name": "大休息",
      "startText": "休息10分钟，去喝水活动一下！",
      "type": 2
    },
    {
      "desc": "专注背诵10个单词",
      "duration": 10,
      "endText": "太厉害了，今天的任务全部完成！",
      "id": "phase_new_03",
      "name": "单词突击",
      "startText": "最后的15分钟，搞定这10个单词，加油！",
      "type": 1
    }
  ],
}