export const lifeScenes = ["childhood", "school", "departure", "station", "city", "home", "crossroads", "late-life", "sunset"] as const;

export type LifeScene = (typeof lifeScenes)[number];

export type EnglishLifeScenario = {
  minAge: number;
  maxAge: number;
  title: string;
  prompt: string;
  scene: LifeScene;
  choices: Array<{
    text: string;
    intent: string;
    effects: Record<string, number>;
    fallback: string;
  }>;
};

export const englishLifeScenarios: EnglishLifeScenario[] = [
  {
    minAge: 3,
    maxAge: 9,
    title: "The missing classroom book",
    scene: "school",
    prompt: "The teacher is collecting the class library books before Friday dismissal. You left yours on the bus, and your family cannot easily pay for a replacement this month. Your name is next on the list.",
    choices: [
      { text: "Tell the teacher now and ask for the weekend to search", intent: "Be honest and ask for time to fix the problem", effects: { ability: 4, stress: 3, relations: 3 }, fallback: "Your explanation comes out in fragments. The teacher does not shame you and asks for an update on Monday. That weekend, you learn exactly where the bus depot keeps lost property." },
      { text: "Borrow the same book from a classmate and hand it in", intent: "Pass the immediate inspection", effects: { stress: -2, relations: -2, ability: 1 }, fallback: "The roll call passes smoothly, but the borrowed copy still has to be returned. One small problem has quietly become two." },
      { text: "Use your allowance to buy a second-hand copy", intent: "Absorb the loss alone", effects: { money: -4, ability: 2, stress: 1 }, fallback: "It takes two used-book shops to find the same edition. Nobody learns what happened, but for several weeks you skip the snacks you usually buy after school." },
    ],
  },
  {
    minAge: 7,
    maxAge: 14,
    title: "The altered test score",
    scene: "school",
    prompt: "Your desk mate secretly changed the score written on a test and asks you to confirm it when the teacher checks. You know poor grades have recently caused shouting at home.",
    choices: [
      { text: "Refuse to lie and encourage them to speak to the teacher", intent: "Stay beside them without joining the deception", effects: { relations: 4, ability: 3, stress: 3 }, fallback: "They avoid you at first, then stay behind after class to talk to the teacher. The consequence remains, but the lie does not grow." },
      { text: "Cover for them this time and offer to study together", intent: "Trade a short-term lie for a chance to recover", effects: { relations: 5, stress: 7, ability: 2 }, fallback: "The check passes. Afterward, every lesson about honesty makes both of you look away for a moment." },
      { text: "Tell the teacher privately and ask them to handle it quietly", intent: "Bring in a trusted adult", effects: { relations: -3, ability: 4, stress: 2 }, fallback: "The teacher deals with it privately. Your friendship cools when the truth comes out, but the altered paper never appears again." },
    ],
  },
  {
    minAge: 13,
    maxAge: 20,
    title: "The final night to choose a course",
    scene: "home",
    prompt: "Your application is due tomorrow morning. The subject you love has uncertain job prospects, while your family's preferred course is safer. The two schools also differ sharply in tuition and distance from home.",
    choices: [
      { text: "Choose the subject you love and apply for aid and part-time work", intent: "Accept the practical cost of following an interest", effects: { ability: 7, money: -5, stress: 7, happiness: 6 }, fallback: "Submitting the form does not bring instant relief. Over the next few months, you prepare for school while learning to account for every living expense." },
      { text: "Choose the safer course and keep your interest as a minor", intent: "Prioritize employability without abandoning the interest", effects: { money: 4, ability: 4, happiness: -1, stress: -1 }, fallback: "Your family relaxes and the path ahead becomes clearer. Outside the timetable, you now have an interest that only you can protect." },
      { text: "Take a gap year and test the field through an internship", intent: "Use real work to test the decision", effects: { money: 2, ability: 5, stress: 5, relations: -2 }, fallback: "While classmates receive acceptance letters, you begin commuting to work. The real job breaks some assumptions and makes other ambitions more precise." },
    ],
  },
  {
    minAge: 18,
    maxAge: 29,
    title: "The deposit and the first lease",
    scene: "city",
    prompt: "Your new job starts next week, but a shared apartment requires two months of deposit today. The agent is pushing a vague contract. A legitimate alternative is farther away and adds an hour to your daily commute.",
    choices: [
      { text: "Reject the vague lease and take the farther apartment", intent: "Trade commuting time for housing certainty", effects: { money: -5, stress: 2, health: -2, ability: 2 }, fallback: "You change trains twice with your luggage. The commute is tiring, but when you lock your own door, you understand exactly what that security cost." },
      { text: "Demand written clauses before paying the deposit", intent: "Spend time clarifying rights and obligations", effects: { ability: 6, stress: 5, money: -2 }, fallback: "The agent pushes back, but you insist on adding each disputed point. The room is imperfect; at least the signature was not made in panic." },
      { text: "Book one week of temporary housing and keep searching", intent: "Pay more to buy decision time", effects: { money: -8, stress: 4, happiness: 1 }, fallback: "You unpack and repack in the temporary room. The extra cost hurts, yet it helps you avoid a contract that could have trapped you for a year." },
    ],
  },
  {
    minAge: 23,
    maxAge: 39,
    title: "The weekend on the overtime list",
    scene: "city",
    prompt: "Your project lead suddenly asks the whole team to work this weekend. You already promised to attend an important family gathering. Missing work will not cost your job, but it may affect the next promotion review.",
    choices: [
      { text: "Go to work and explain the decision to your family in advance", intent: "Prioritize the immediate career opportunity", effects: { money: 5, ability: 5, relations: -6, stress: 6 }, fallback: "The meeting ends earlier than expected, but the gathering is already over. You receive praise from your lead and later see family photos with a space where you might have stood." },
      { text: "Attend the gathering and finish the work on Sunday night", intent: "Carry both responsibilities", effects: { relations: 5, health: -4, stress: 8, ability: 3 }, fallback: "You make the family photo but never fully relax. Your screen remains bright late on Sunday, and Monday still arrives on schedule." },
      { text: "Swap shifts with a colleague and cover for them next time", intent: "Protect the commitment through negotiation", effects: { relations: 3, ability: 4, stress: 3 }, fallback: "A colleague agrees. You keep this weekend and take on a clear future obligation, which feels easier to repay than vague guilt." },
    ],
  },
  {
    minAge: 27,
    maxAge: 46,
    title: "The early rent increase notice",
    scene: "home",
    prompt: "Your landlord says the rent will rise next quarter. Moving would save money but break your familiar commute and neighborhood ties. Staying means cutting one regular expense every month.",
    choices: [
      { text: "Offer a longer lease in exchange for a smaller increase", intent: "Use a commitment to negotiate stability", effects: { ability: 4, money: -3, stress: 2 }, fallback: "You prepare nearby rent figures and your payment history. The landlord does not fully give way, but the increase falls to an amount you can plan around." },
      { text: "Move to a less expensive neighborhood", intent: "Accept disruption to reduce fixed costs", effects: { money: 7, relations: -3, stress: 6, ability: 2 }, fallback: "Boxes fill the new room. Your expenses fall, but every ordinary route and local connection has to be built again." },
      { text: "Stay and pause travel and entertainment spending", intent: "Protect the routines you already have", effects: { money: -5, happiness: -4, stress: -1 }, fallback: "The same key still opens the same door. You avoid the chaos of moving and begin declining more of the invitations that appear in your messages." },
    ],
  },
  {
    minAge: 34,
    maxAge: 55,
    title: "A parent's follow-up appointment",
    scene: "home",
    prompt: "A parent described an appointment as a routine check, but you discover they need someone there. It falls on the day of a presentation you lead, and taking leave means handing it to a colleague at short notice.",
    choices: [
      { text: "Take leave and hand over the presentation properly", intent: "Put family health first that day", effects: { relations: 9, ability: 2, stress: 6, money: -2 }, fallback: "The waiting room takes most of the day and the results require more observation. You miss the presentation but finally hear the details your parent had left out." },
      { text: "Ask a trusted relative to go first and join after the meeting", intent: "Coordinate help across both responsibilities", effects: { relations: 5, ability: 5, stress: 7, money: -2 }, fallback: "You hurry to the clinic after the meeting. Neither responsibility is abandoned, and neither one feels light." },
      { text: "Lead the presentation and discuss the results that evening", intent: "Prioritize the work commitment", effects: { ability: 6, money: 3, relations: -5, stress: 4 }, fallback: "The presentation goes well. On the evening call, your parent still says everything is fine, but several pauses sound unfamiliar." },
    ],
  },
  {
    minAge: 42,
    maxAge: 65,
    title: "The role after the merger",
    scene: "crossroads",
    prompt: "After a department merger, you can stay in a role with the same salary but less authority, or leave with severance. Your household's fixed expenses mean a long gap between jobs is risky.",
    choices: [
      { text: "Stay for six months while rebuilding your skills and résumé", intent: "Protect cash flow while preparing to move", effects: { money: 5, ability: 6, stress: 6, happiness: -2 }, fallback: "Your new desk sits farther from the important meetings. By day you finish the transition; by night you build a portfolio with a clear six-month deadline." },
      { text: "Take the severance and focus fully on a new direction", intent: "Use savings to create transition time", effects: { money: -5, ability: 7, stress: 7, happiness: 4 }, fallback: "The first week without work is unnaturally quiet. The severance creates a window, and gives every application an unmistakable time cost." },
      { text: "Apply to move into a team that is still growing", intent: "Re-establish your value inside the company", effects: { ability: 5, relations: 3, stress: 8 }, fallback: "You schedule conversations with unfamiliar managers. Nobody guarantees a role, but you are no longer waiting for the organization to choose your next step." },
    ],
  },
  {
    minAge: 55,
    maxAge: 72,
    title: "The repair list for the old house",
    scene: "home",
    prompt: "The home you have lived in for years has started leaking, and repairs are expensive. Family members suggest selling for a smaller place, but it is difficult to see the familiar rooms as only an asset.",
    choices: [
      { text: "Repair it in stages and continue living there", intent: "Pay to preserve a familiar life", effects: { money: -9, happiness: 5, stress: 3 }, fallback: "Construction noise lasts for weeks, leaving a visible line between old and new paint. The house does not return to the past, but it can still hold daily life." },
      { text: "Sell and move somewhere easier to maintain", intent: "Trade a goodbye for safety and ease", effects: { money: 7, health: 4, happiness: -4, stress: 5 }, fallback: "After signing, you spend days deciding what to take. The new home is easier, though at night you still reach for the old window without thinking." },
      { text: "Make only urgent repairs and decide again next year", intent: "Limit the cost and postpone the farewell", effects: { money: -4, stress: 1, ability: 2 }, fallback: "The worst leak stops. You gain a year, knowing the decision has not disappeared—only been given more room." },
    ],
  },
  {
    minAge: 66,
    maxAge: 82,
    title: "The standing Wednesday arrangement",
    scene: "late-life",
    prompt: "Your family asks you to provide childcare or elder care every Wednesday. It would help them greatly, but it would also replace time you use for exercise, friends, and rest.",
    choices: [
      { text: "Commit to one fixed day but refuse last-minute additions", intent: "Offer help with a clear boundary", effects: { relations: 7, health: -1, stress: 2 }, fallback: "Wednesdays become busy and predictable. Your family learns to plan ahead, and you keep the rest of the week as your own." },
      { text: "Help only in emergencies, not on a fixed schedule", intent: "Protect your own routine", effects: { relations: -2, health: 4, stress: -2, happiness: 3 }, fallback: "Your family has to find another arrangement and is frustrated at first. You still appear when the need is real, but your time is no longer treated as automatically available." },
      { text: "Try the arrangement for one month, then review it together", intent: "Test the real burden before committing", effects: { relations: 5, stress: 3, ability: 2 }, fallback: "The month contains warmth and exhaustion. At the end, everyone can discuss a real schedule instead of negotiating through guilt and imagination." },
    ],
  },
];

export function englishChapterForAge(age: number) {
  if (age < 6) return "Early years";
  if (age < 13) return "Childhood";
  if (age < 19) return "Youth";
  if (age < 26) return "Leaving home";
  if (age < 36) return "Young adult";
  if (age < 51) return "Midlife";
  if (age < 66) return "New direction";
  if (age < 78) return "Later life";
  return "Twilight";
}
