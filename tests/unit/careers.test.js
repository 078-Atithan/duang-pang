import test from "node:test"
import assert from "node:assert/strict"
import { CAREERS, OTHER_CAREER, careerText } from "../../js/data/careers.js"

test("career options have unique ids, English and Thai names, and Other last", () => {
  assert.equal(new Set(CAREERS.map((career) => career.id)).size, CAREERS.length)
  for (const career of CAREERS) {
    assert.equal(career.label.length, 2, career.id)
    assert.match(career.label[1], /[\u0E00-\u0E7F]/, `${career.id} has a Thai name`)
  }
  assert.equal(CAREERS.at(-1).id, OTHER_CAREER)
})

test("the reading receives the English career name, or the typed text for Other", () => {
  assert.equal(careerText({ career: "teacher", careerOther: "" }), "Teacher")
  assert.equal(careerText({ career: OTHER_CAREER, careerOther: "  Tattoo artist " }), "Tattoo artist")
  assert.equal(careerText({ career: "", careerOther: "" }), "")
})
