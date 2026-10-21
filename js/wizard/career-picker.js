// Searchable career picker for the details step. Typing filters the list (English or Thai names);
// "Other" is always the last option and reveals a free-text field.
import { CAREERS, OTHER_CAREER, findCareer } from "../data/careers.js"
import { local, t } from "../i18n/index.js"
import { state } from "../state.js"
import { $, escapeHtml, label } from "../dom.js"
import { clearDraw } from "./draw.js"

const careerName = (career) => local(career.label)
const normalize = (text) => text.trim().toLocaleLowerCase()
// An option whose English or Thai name is exactly the typed text ("Other" is never matched this way).
const exactMatch = (text) =>
  CAREERS.find(
    (career) =>
      career.id !== OTHER_CAREER &&
      career.label.some((name) => normalize(name) === normalize(text))
  )

export function careerField() {
  const chosen = findCareer(state.profile.career)
  const isOther = state.profile.career === OTHER_CAREER
  return `<div class="field career-field"><label class="field-label" for="career">${label("career")}</label><input id="career" name="careerSearch" type="text" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="career-list" autocomplete="off" required maxlength="80" placeholder="${label("careerSearch")}" value="${escapeHtml(chosen ? careerName(chosen) : "")}"><ul id="career-list" class="combobox-list" role="listbox" aria-label="${label("career")}" hidden></ul><input id="careerOther" name="careerOther" maxlength="120" aria-label="${label("careerOtherLabel")}" placeholder="${label("careerOtherPlaceholder")}" value="${escapeHtml(state.profile.careerOther)}" ${isOther ? "required" : "hidden"}></div>`
}

/** Wires up the picker after the details step renders. */
export function bindCareerPicker() {
  const input = $("#career")
  if (!input) return
  const list = $("#career-list")
  const other = $("#careerOther")
  let options = []
  let active = -1

  const setCareer = (id) => {
    if (state.profile.career !== id && state.chosen.length) clearDraw()
    state.profile.career = id
    const isOther = id === OTHER_CAREER
    other.hidden = !isOther
    other.required = isOther
  }

  const render = () => {
    const query = input.value.trim()
    list.innerHTML = options
      .map((career, index) => {
        const isOther = career.id === OTHER_CAREER
        // With no matches, show what "Other" will keep: Other: “typed text”.
        const name =
          isOther && options.length === 1 && query
            ? `${careerName(career)}: “${query}”`
            : careerName(career)
        return `<li id="career-option-${career.id}" role="option" class="combobox-option ${isOther ? "is-other" : ""} ${index === active ? "is-active" : ""}" data-career="${career.id}" aria-selected="${career.id === state.profile.career}">${escapeHtml(name)}</li>`
      })
      .join("")
    if (active >= 0) input.setAttribute("aria-activedescendant", `career-option-${options[active].id}`)
    else input.removeAttribute("aria-activedescendant")
    list.querySelector(".is-active")?.scrollIntoView({ block: "nearest" })
  }

  const filter = () => {
    const query = normalize(input.value)
    const chosen = findCareer(state.profile.career)
    // When the box shows the current choice, list everything so it is easy to switch.
    const showAll = !query || (chosen && careerName(chosen) === input.value)
    if (showAll) {
      options = CAREERS
      return
    }
    // Best matches first: name starts with the text, then a word starts with it, then it appears anywhere.
    const rank = (career) => {
      const names = career.label.map(normalize)
      if (names.some((name) => name.startsWith(query))) return 0
      if (names.some((name) => name.split(/[\s/]+/).some((word) => word.startsWith(query)))) return 1
      return names.some((name) => name.includes(query)) ? 2 : -1
    }
    const matches = CAREERS.filter((career) => career.id !== OTHER_CAREER)
      .map((career) => ({ career, rank: rank(career) }))
      .filter((match) => match.rank >= 0)
      .sort((a, b) => a.rank - b.rank)
      .map((match) => match.career)
    options = [...matches, findCareer(OTHER_CAREER)]
  }

  const open = () => {
    filter()
    active = options.findIndex((career) => career.id === state.profile.career)
    list.hidden = false
    input.setAttribute("aria-expanded", "true")
    render()
  }

  const close = () => {
    list.hidden = true
    input.setAttribute("aria-expanded", "false")
    active = -1
    input.removeAttribute("aria-activedescendant")
  }

  const choose = (id) => {
    const typed = input.value.trim()
    setCareer(id)
    input.value = careerName(findCareer(id))
    input.setCustomValidity("")
    close()
    if (id !== OTHER_CAREER) return
    // Carry over a search that matched nothing (not even "Other"), so it does not have to be typed twice.
    const matchedSomething = CAREERS.some((career) =>
      career.label.some((name) => normalize(name).includes(normalize(typed)))
    )
    if (!state.profile.careerOther && typed && !matchedSomething) {
      other.value = typed
      state.profile.careerOther = typed
    }
    other.focus()
  }

  input.addEventListener("focus", open)
  input.addEventListener("click", () => {
    if (list.hidden) open()
  })
  input.addEventListener("blur", close)
  input.addEventListener("input", () => {
    // Typing replaces the previous choice until an option is picked (or the exact name is typed).
    setCareer(exactMatch(input.value)?.id ?? "")
    input.setCustomValidity(input.value.trim() && !state.profile.career ? t("careerChoose") : "")
    // A full name is already a choice; close the list so it does not cover the Continue button.
    if (state.profile.career) return close()
    filter()
    active = input.value.trim() ? 0 : -1
    list.hidden = false
    input.setAttribute("aria-expanded", "true")
    render()
  })
  input.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault()
      if (list.hidden) return open()
      const step = event.key === "ArrowDown" ? 1 : -1
      active = (active + step + options.length) % options.length
      render()
    } else if (event.key === "Enter" && !list.hidden && active >= 0) {
      event.preventDefault()
      choose(options[active].id)
    } else if (event.key === "Escape" && !list.hidden) {
      event.preventDefault()
      close()
    }
  })
  // Keep focus in the input while clicking an option, so blur does not close the list first.
  list.addEventListener("mousedown", (event) => event.preventDefault())
  list.addEventListener("click", (event) => {
    const option = event.target.closest("[data-career]")
    if (option) choose(option.dataset.career)
  })
}
