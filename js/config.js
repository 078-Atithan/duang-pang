// Public configuration only. API keys belong in the server's environment.
export const CONFIG = Object.freeze({
  deckUrl: './assets/data/tarot-images.json',
  imageDirectory: './assets/images/tarot/',
  cardBack: './assets/card-back.svg',
  apiBase: '/api',
  maxQuestionLength: 1000,
});

export const TOPICS = [
  { id: 'love', icon: 'heart', en: 'Love', th: 'ความรัก', description: ['Matters of the heart', 'เรื่องราวของหัวใจ'], focus: ['notice how you give and receive affection', 'สังเกตวิธีที่คุณมอบและรับความรัก'] },
  { id: 'finances', icon: 'coin', en: 'Finances', th: 'การเงิน', description: ['Find your balance', 'ค้นหาสมดุลของคุณ'], focus: ['reflect on your relationship with resources', 'ทบทวนความสัมพันธ์ของคุณกับทรัพยากรที่มี'] },
  { id: 'career', icon: 'case', en: 'Career', th: 'การงาน', description: ['Your next chapter', 'บทต่อไปของคุณ'], focus: ['consider what makes your work meaningful', 'พิจารณาว่าอะไรทำให้งานของคุณมีความหมาย'] },
  { id: 'daily', icon: 'sun', en: 'Daily guidance', th: 'ดวงรายวัน', description: ['Make space for today', 'เปิดพื้นที่ให้วันนี้'], focus: ['choose one small intention for today', 'เลือกความตั้งใจเล็ก ๆ หนึ่งอย่างสำหรับวันนี้'] },
  { id: 'monthly', icon: 'moon', en: 'Monthly outlook', th: 'ดวงรายเดือน', description: ['See the bigger picture', 'มองภาพให้กว้างขึ้น'], focus: ['consider what deserves your attention this month', 'พิจารณาว่าอะไรควรได้รับความใส่ใจในเดือนนี้'] },
  { id: 'health', icon: 'leaf', en: 'Wellbeing', th: 'สุขภาวะ', description: ['Care for your energy', 'ใส่ใจพลังงานของคุณ'], focus: ['notice what helps you rest and feel supported', 'สังเกตว่าอะไรช่วยให้คุณได้พักและรู้สึกมีคนสนับสนุน'] },
  { id: 'luck', icon: 'sparkle', en: 'Luck & possibilities', th: 'โชคและโอกาส', description: ['Welcome the unexpected', 'เปิดรับสิ่งที่ไม่คาดคิด'], focus: ['notice possibilities without relying on chance', 'สังเกตความเป็นไปได้โดยไม่ฝากทุกอย่างไว้กับโชค'] },
  { id: 'relationships', icon: 'people', en: 'Friends & connections', th: 'เพื่อนและความสัมพันธ์', description: ['The people around you', 'ผู้คนรอบตัวคุณ'], focus: ['reflect on trust, boundaries, and communication', 'ทบทวนเรื่องความไว้ใจ ขอบเขต และการสื่อสาร'] },
];

export const SPREADS = [
  { id: 'timeline', count: 3, en: 'Your unfolding story', th: 'เรื่องราวของคุณ', positions: [['Past', 'Present', 'Future'], ['อดีต', 'ปัจจุบัน', 'อนาคต']],
    positionDescriptions: [['Experiences that brought you here.', 'What deserves your attention now.', 'A possible direction from here.'], ['ประสบการณ์ที่พาคุณมาถึงจุดนี้', 'สิ่งที่ควรใส่ใจในเวลานี้', 'ทิศทางที่เป็นไปได้จากนี้']] },
  { id: 'connection', count: 3, en: 'Heart to heart', th: 'จากใจถึงใจ', positions: [['Your feelings', 'Their feelings', 'Future trends'], ['ความรู้สึกของคุณ', 'ความรู้สึกของอีกฝ่าย', 'แนวโน้มในอนาคต']],
    positionDescriptions: [['Explore what is in your heart.', 'Reflect on your view of their feelings.', 'How this connection could develop.'], ['สำรวจความรู้สึกในใจของคุณ', 'ทบทวนมุมมองของคุณต่อความรู้สึกอีกฝ่าย', 'แนวทางที่ความสัมพันธ์อาจพัฒนาต่อไป']] },
  { id: 'clarity', count: 3, en: 'A clearer perspective', th: 'มุมมองที่ชัดขึ้น', positions: [['Cause', 'Effect', 'Conclusion'], ['สาเหตุ', 'ผลกระทบ', 'บทสรุป']],
    positionDescriptions: [['What may be shaping this situation.', 'The impact to consider.', 'What you can learn from the whole picture.'], ['ปัจจัยที่อาจส่งผลต่อสถานการณ์นี้', 'ผลที่เกิดขึ้นและควรนำมาพิจารณา', 'สิ่งที่เรียนรู้ได้เมื่อมองภาพรวม']] },
  { id: 'guidance', count: 4, en: 'The way forward', th: 'เส้นทางข้างหน้า', positions: [['Current situation', 'Obstacle', 'Advice', 'Conclusion'], ['สถานการณ์ปัจจุบัน', 'อุปสรรค', 'คำแนะนำ', 'บทสรุป']],
    positionDescriptions: [['Where things stand right now.', 'What may be holding you back.', 'An approach you can try.', 'Your takeaway and possible next step.'], ['ภาพของสิ่งที่กำลังเกิดขึ้นในตอนนี้', 'สิ่งที่อาจขัดขวางการเดินหน้าของคุณ', 'แนวทางที่คุณนำไปลองปรับใช้ได้', 'ข้อคิดและก้าวต่อไปที่เป็นไปได้']] },
];

// Inline SVG paths are trusted constants, never user-supplied markup.
const ICON_PATHS = {
  heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
  coin: '<circle cx="12" cy="12" r="9"/><path d="M15 8h-4a2 2 0 0 0 0 4h2a2 2 0 0 1 0 4H9m3-10v12"/>',
  case: '<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V4h8v3M3 12q9 5 18 0m-9 0v4"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 1v3m0 16v3M1 12h3m16 0h3M4.2 4.2l2.1 2.1m11.4 11.4 2.1 2.1M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
  moon: '<path d="M20 14.2A9 9 0 0 1 9.8 4a9 9 0 1 0 10.2 10.2Z"/><path d="M18 2v5m-2.5-2.5h5"/>',
  leaf: '<path d="M20 3C9 2 3 8 5 15c6 7 16 2 15-12ZM3 22 15 9m-6 6v-5m0 5h6"/>',
  sparkle: '<path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5ZM20 2v4m-2-2h4"/>',
  people: '<circle cx="9" cy="7" r="3"/><path d="M3 21v-4a6 6 0 0 1 12 0v4m0-17a3 3 0 1 1 0 6m3 3a5 5 0 0 1 3 4v4"/>',
};
export function icon(name) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[name] || ICON_PATHS.sparkle}</svg>`;
}
