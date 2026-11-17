/*
 * Course data: marks and the order they are run.
 * Source: the event's Notice of Race and Sailing Instructions.
 * Edit this file for a new year's course. Latitude N is positive, longitude W is negative.
 */
window.LOG_RACE_COURSE = {
  title: "Log Race",
  date: "Saturday, November 21, 2026",
  raceDate: "2026-11-21T12:00:00-05:00", // used for the magnetic model
  defaultVariationW: 7.4, // manual fallback, degrees West (WMM2025 gives 7.4° W here for the race date)

  // Unique marks. `kind` sets the chart symbol.
  marks: [
    { id: "start",  name: "Start",          detail: "RC signal boat (orange flag) to Q R 16ft 3M \"2\"", kind: "line",   lat: [25, 43.25], lon: [80, 12.45] },
    { id: "c",      name: "Mark C",         detail: "Inflatable mark",                                   kind: "buoy",   lat: [25, 36.09], lon: [80, 13.08] },
    { id: "r2",     name: "R \"2\"",        detail: "FL R 4s 16ft 4M \"2\"",                              kind: "red",    lat: [25, 35.94], lon: [80, 14.17] },
    { id: "g1",     name: "G \"1\"",        detail: "GR \"1\"",                                           kind: "green",  lat: [25, 32.63], lon: [80, 12.55] },
    { id: "finish", name: "Finish",         detail: "RC boat (orange flag) to inflatable mark, ~0.5 nm W of East Featherbed Bank R \"2\"", kind: "line", lat: [25, 31.40], lon: [80, 12.12] }
  ],

  // The order the course is sailed, with the side each mark is left on.
  course: [
    { mark: "start" },
    { mark: "c",      rounding: "starboard" },
    { mark: "r2",     rounding: "port" },
    { mark: "c",      rounding: "starboard" },
    { mark: "g1",     rounding: "port" },
    { mark: "finish" }
  ]
};
