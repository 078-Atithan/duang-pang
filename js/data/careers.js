// Occupations offered in the details step, as [English, Thai] labels.
// "other" lets people type their own and always stays last.
export const OTHER_CAREER = "other"

export const CAREERS = [
  { id: "student", label: ["Student", "นักเรียน / นักศึกษา"] },
  { id: "teacher", label: ["Teacher", "ครู / อาจารย์"] },
  { id: "doctor", label: ["Doctor", "แพทย์"] },
  { id: "nurse", label: ["Nurse", "พยาบาล"] },
  { id: "healthcare", label: ["Healthcare worker", "บุคลากรสาธารณสุข"] },
  { id: "engineer", label: ["Engineer", "วิศวกร"] },
  { id: "developer", label: ["Software developer", "นักพัฒนาซอฟต์แวร์"] },
  { id: "it", label: ["IT professional", "งานไอที"] },
  { id: "designer", label: ["Designer", "นักออกแบบ"] },
  { id: "artist", label: ["Artist or musician", "ศิลปิน / นักดนตรี"] },
  { id: "writer", label: ["Writer or content creator", "นักเขียน / ครีเอเตอร์"] },
  { id: "business", label: ["Business owner", "เจ้าของธุรกิจ"] },
  { id: "sales", label: ["Sales or marketing", "การขาย / การตลาด"] },
  { id: "finance", label: ["Finance or accounting", "การเงิน / บัญชี"] },
  { id: "office", label: ["Office worker", "พนักงานออฟฟิศ"] },
  { id: "government", label: ["Government officer", "ข้าราชการ / พนักงานรัฐ"] },
  { id: "lawyer", label: ["Lawyer", "นักกฎหมาย"] },
  { id: "service", label: ["Service or hospitality", "งานบริการ / การโรงแรม"] },
  { id: "technician", label: ["Technician or tradesperson", "ช่างเทคนิค"] },
  { id: "farmer", label: ["Farmer", "เกษตรกร"] },
  { id: "freelancer", label: ["Freelancer", "ฟรีแลนซ์"] },
  { id: "homemaker", label: ["Homemaker", "แม่บ้าน / พ่อบ้าน"] },
  { id: "jobseeker", label: ["Looking for work", "กำลังหางาน"] },
  { id: "retired", label: ["Retired", "เกษียณ"] },
  { id: OTHER_CAREER, label: ["Other", "อื่น ๆ"] }
]

export const findCareer = (id) => CAREERS.find((career) => career.id === id)

/** The occupation sent with a reading: the option's English name, or what the person typed for "Other". */
export function careerText(profile) {
  if (profile.career === OTHER_CAREER) return profile.careerOther.trim()
  return findCareer(profile.career)?.label[0] ?? ""
}
