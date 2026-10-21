// Steps 1-4 of the wizard: topic, question, spread and personal details.
import { CONFIG } from "../config.js"
import { TOPICS } from "../data/topics.js"
import { SPREADS } from "../data/spreads.js"
import { icon } from "../data/icons.js"
import { OTHER_CAREER } from "../data/careers.js"
import { t, local } from "../i18n/index.js"
import { state, session } from "../state.js"
import { $, escapeHtml, label, named, localToday } from "../dom.js"
import { heading, footer } from "./wizard.js"
import { careerField } from "./career-picker.js"

export function renderTopic() {
  return `${heading("topicTitle", "topicDescription")}<form id="step-form"><fieldset><legend class="sr-only">${label("topicLegend")}</legend><div class="topic-grid">${TOPICS.map((topic) => `<label class="choice topic-choice"><input type="radio" name="topic" value="${topic.id}" ${state.topic === topic.id ? "checked" : ""} required><span class="choice-body">${icon(topic.icon)}<span class="choice-check" aria-hidden="true">✓</span><span class="choice-title">${escapeHtml(named(topic))}</span><span class="choice-subtitle">${escapeHtml(local(topic.description))}</span></span></label>`).join("")}</div></fieldset>${footer("topicHint")}</form>`
}

export function renderQuestion() {
  return `${heading("questionTitle", "questionDescription")}<form id="step-form"><div class="question-layout"><div><label class="field-label" for="question">${label("questionLabel")}<span class="optional">${label("optional")}</span></label><textarea id="question" name="question" maxlength="${CONFIG.maxQuestionLength}" placeholder="${label("questionPlaceholder")}" aria-describedby="question-help">${escapeHtml(state.question)}</textarea><div class="field-meta"><span id="question-help">${label("questionPrivacy")}</span><span id="question-count">${state.question.length}/${CONFIG.maxQuestionLength}</span></div></div><aside class="question-tips"><h4>${label("tipsTitle")}</h4><button class="example-button" type="button" data-action="example">“${label("example")}” ↗</button><p class="tip-good">${label("goodTip")}</p><p>${label("avoidTip")}</p></aside></div>${footer("questionHint")}</form>`
}

export function renderSpread() {
  return `${heading("spreadTitle", "spreadDescription")}<form id="step-form"><fieldset><legend class="field-label">${label("cardCount")}</legend><div class="spread-count">${[3, 4].map((count) => `<label class="choice"><input type="radio" name="count" value="${count}" ${state.count === count ? "checked" : ""}><span class="choice-body"><span class="choice-title">${label("cards", { count })}</span></span></label>`).join("")}</div></fieldset><fieldset><legend class="sr-only">${label("spreadLegend")}</legend><div class="spread-grid ${state.count === 4 ? "single" : ""}">${SPREADS.filter(
    (item) => item.count === state.count
  )
    .map(
      (item) =>
        `<label class="choice spread-choice"><input type="radio" name="spread" value="${item.id}" ${state.spread === item.id ? "checked" : ""}><span class="choice-body"><span class="mini-spread" aria-hidden="true">${Array.from({ length: item.count }, (_, index) => `<span class="mini-card">${index + 1}</span>`).join("")}</span><span class="choice-title">${escapeHtml(named(item))}</span><span class="spread-positions">${local(item.positions).map(escapeHtml).join(" · ")}</span></span></label>`
    )
    .join("")}</div></fieldset>${footer("spreadHint")}</form>`
}

function selectField(name, options) {
  return `<div class="field"><label class="field-label" for="${name}">${label(name)}</label><select id="${name}" name="${name}" required><option value="" disabled ${state.profile[name] ? "" : "selected"}>${label("choose")}</option>${options.map((value) => `<option value="${value}" ${state.profile[name] === value ? "selected" : ""}>${label(value)}</option>`).join("")}</select></div>`
}

export function renderDetails() {
  return `${heading("detailsTitle", "detailsDescription")}<form id="step-form"><div class="details-grid"><div class="field"><label class="field-label" for="name">${label("name")}</label><input id="name" name="name" required autocomplete="name" maxlength="80" placeholder="${label("namePlaceholder")}" value="${escapeHtml(state.profile.name)}"></div><div class="field"><label class="field-label" for="birthDate">${label("birthDate")}</label><input id="birthDate" name="birthDate" type="date" required min="1900-01-01" max="${localToday()}" value="${escapeHtml(state.profile.birthDate)}"></div>${selectField("status", ["single", "relationship", "married"])}${selectField("gender", ["female", "male", "other"])}${careerField()}</div><p class="privacy-inline"><span aria-hidden="true">♧</span>${label(session.serverConfig.mode === "ai" ? "privacyAi" : "privacyLocal")}</p>${footer("", "drawStart")}</form>`
}

/** Checks the browser's `required` attribute cannot do. Shows the message and returns false when a field is invalid. */
export function validateDetails() {
  // `required` accepts spaces only, so check the text fields after trimming.
  const textFields = state.profile.career === OTHER_CAREER ? ["name", "careerOther"] : ["name"]
  const blank = textFields.find((field) => !state.profile[field].trim())
  if (blank) {
    $(`#${blank}`).setCustomValidity(t("requiredField"))
    $(`#${blank}`).reportValidity()
    return false
  }
  if (
    state.profile.birthDate &&
    (state.profile.birthDate > localToday() ||
      state.profile.birthDate < "1900-01-01")
  ) {
    $("#birthDate").setCustomValidity(t("dateError"))
    $("#birthDate").reportValidity()
    return false
  }
  return true
}
