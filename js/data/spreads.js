// Card layouts. Each position has an [English, Thai] name and description.
export const SPREADS = [
  {
    id: "timeline",
    count: 3,
    en: "Your unfolding story",
    th: "เรื่องราวของคุณ",
    positions: [
      ["Past", "Present", "Future"],
      ["อดีต", "ปัจจุบัน", "อนาคต"]
    ],
    positionDescriptions: [
      [
        "Experiences that brought you here.",
        "What deserves your attention now.",
        "A possible direction from here."
      ],
      [
        "ประสบการณ์ที่พาคุณมาถึงจุดนี้",
        "สิ่งที่ควรใส่ใจในเวลานี้",
        "ทิศทางที่เป็นไปได้จากนี้"
      ]
    ]
  },
  {
    id: "connection",
    count: 3,
    en: "Heart to heart",
    th: "จากใจถึงใจ",
    positions: [
      ["Your feelings", "Their feelings", "Future trends"],
      ["ความรู้สึกของคุณ", "ความรู้สึกของอีกฝ่าย", "แนวโน้มในอนาคต"]
    ],
    positionDescriptions: [
      [
        "Explore what is in your heart.",
        "Reflect on your view of their feelings.",
        "How this connection could develop."
      ],
      [
        "สำรวจความรู้สึกในใจของคุณ",
        "ทบทวนมุมมองของคุณต่อความรู้สึกอีกฝ่าย",
        "แนวทางที่ความสัมพันธ์อาจพัฒนาต่อไป"
      ]
    ]
  },
  {
    id: "clarity",
    count: 3,
    en: "A clearer perspective",
    th: "มุมมองที่ชัดขึ้น",
    positions: [
      ["Cause", "Effect", "Conclusion"],
      ["สาเหตุ", "ผลกระทบ", "บทสรุป"]
    ],
    positionDescriptions: [
      [
        "What may be shaping this situation.",
        "The impact to consider.",
        "What you can learn from the whole picture."
      ],
      [
        "ปัจจัยที่อาจส่งผลต่อสถานการณ์นี้",
        "ผลที่เกิดขึ้นและควรนำมาพิจารณา",
        "สิ่งที่เรียนรู้ได้เมื่อมองภาพรวม"
      ]
    ]
  },
  {
    id: "guidance",
    count: 4,
    en: "The way forward",
    th: "เส้นทางข้างหน้า",
    positions: [
      ["Current situation", "Obstacle", "Advice", "Conclusion"],
      ["สถานการณ์ปัจจุบัน", "อุปสรรค", "คำแนะนำ", "บทสรุป"]
    ],
    positionDescriptions: [
      [
        "Where things stand right now.",
        "What may be holding you back.",
        "An approach you can try.",
        "Your takeaway and possible next step."
      ],
      [
        "ภาพของสิ่งที่กำลังเกิดขึ้นในตอนนี้",
        "สิ่งที่อาจขัดขวางการเดินหน้าของคุณ",
        "แนวทางที่คุณนำไปลองปรับใช้ได้",
        "ข้อคิดและก้าวต่อไปที่เป็นไปได้"
      ]
    ]
  }
]
