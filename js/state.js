import { SPREADS } from "./data/spreads.js"

// The reading in progress. Every module shares this one object and changes it in place.
const freshState = () => ({
  step: 0,
  topic: "",
  question: "",
  count: 3,
  spread: "timeline",
  profile: {
    name: "",
    birthDate: "",
    status: "",
    gender: "",
    career: "", // an id from data/careers.js
    careerOther: "" // typed text when career is "other"
  },
  chosen: [],
  hand: [],
  actions: [],
  phase: "stacked",
  consent: false,
  busy: false,
  error: "",
  result: null,
  resultPayload: null,
  resultLanguages: {}
})
export const state = freshState()

export function resetState() {
  for (const key of Object.keys(state)) delete state[key]
  Object.assign(state, freshState())
}

// Loaded data and in-flight work that outlive a single reading.
export const session = {
  deck: [],
  serverConfig: { mode: "demo" },
  activeRequest: null, // AbortController of the current AI request
  drawController: null, // AbortController of the current shuffle or card flight
  stopResultEffects: () => {}
}

export const motionLocked = () =>
  state.busy || ["shuffling", "drawing"].includes(state.phase)
export const currentSpread = () =>
  SPREADS.find((item) => item.id === state.spread)
