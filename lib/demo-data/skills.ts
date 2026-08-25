import type { MasteryTier, Skill, TierStyle } from "./types";

/**
 * Mia Ndlovu's skill progression, Teneo Grade 8 Algebra: equations, week 6 of
 * the pilot. Progress and Learn both rendered this same list independently in
 * the prototype; it lives here once so the two can no longer drift apart.
 */
export const SKILLS: Skill[] = [
  {
    id: "s0",
    slug: "equation_basics",
    name: "Equation basics & balancing",
    tier: "durable",
    flagged: false,
    progressDetail:
      "Locked in since early in the unit — no review needed right now.",
    source: "Grade 8 Algebra Curriculum Guide, Unit 1",
    lesson:
      "Think of an equation like a balanced scale at a grocery store. On one side you have some apples, and on the other side you have weights—and right now they're perfectly balanced, not tipping either way. That balanced state is what the equal sign means. When you do something to one side of the equation, like adding or removing an apple, the scale tips out of balance, so you have to do the exact same thing to the other side to make it level again. The whole point of working with equations is to keep that balance while you figure out what the unknown thing is. Whatever you do to one side, you do to the other, and that's how you solve for what you're looking for.",
  },
  {
    id: "s1",
    slug: "integer_operations",
    name: "Integer operations",
    tier: "struggling",
    flagged: true,
    progressDetail:
      "Flagged as a gap underneath the current unit — worth reinforcing alongside two-step equations.",
    source: "Grade 8 Algebra Curriculum Guide, Unit 1",
    lesson:
      "Think of integers like money in your wallet—positive numbers are dollars you have, and negative numbers are dollars you owe. When you do operations with integers, you're basically managing that money: adding more cash increases what you have, subtracting takes it away, and when you owe money and add more debt, you go further into the negative. Multiplying and dividing integers works the same way, except you're scaling up or breaking down those amounts. The key is paying attention to the signs, because owing money twice as much is very different from having twice as much, and learning these operations helps you work with equations that have both positive and negative values.",
  },
  {
    id: "s2",
    slug: "one_step",
    name: "One-step equations",
    tier: "tentative",
    flagged: false,
    progressDetail:
      "Getting there — one more clean streak and this should stick for good.",
    source: "Grade 8 Algebra Curriculum Guide, Unit 2",
    lesson:
      "Think of a one-step equation like figuring out what's inside a locked box. You know what the box weighs when it's sealed, and you know the box itself weighs a certain amount, so you can subtract to find what's inside. In the same way, an equation like x + 5 = 12 is telling you that some unknown number plus 5 equals 12, and your job is to undo that addition to find what x actually is. You solve it by doing the opposite operation—if something was added, you subtract it from both sides, and if something was multiplied, you divide both sides by that number. The key is keeping things balanced, just like a seesaw: whatever you do to one side, you do to the other side too. Once you get x by itself, you've found the answer.",
  },
  {
    id: "s3",
    slug: "two_step",
    name: "Two-step equations",
    tier: "struggling",
    flagged: false,
    progressDetail: "What you're actively working on right now.",
    source: "Grade 8 Algebra Curriculum Guide, Unit 2",
    lesson:
      "Imagine you're trying to figure out how much money your friend started with before spending some and then doubling what was left. To work backwards and find that starting amount, you'd need to undo those actions in reverse order—first undo the doubling, then undo the spending. Two-step equations work exactly the same way: you have an unknown number that's been changed by two operations, and you reverse those operations one at a time to find what the unknown started as. The trick is to undo them in backwards order—if something was multiplied and then added to, you subtract first, then divide. Once you get the hang of undoing operations in the right sequence, you can solve any two-step equation.",
  },
  {
    id: "s4",
    slug: "multi_step",
    name: "Multi-step equations",
    tier: "emerging",
    flagged: false,
    progressDetail: "Just starting to take shape from early exposure.",
    source: "Grade 8 Algebra Curriculum Guide, Unit 3",
    lesson:
      "Imagine you're trying to figure out how much money your friend started with. She spent $12 on a movie ticket, then spent half of what she had left on snacks, and ended up with $8. To work backwards and find her starting amount, you'd need to undo each thing she did, but in reverse order—first accounting for the snacks, then the movie ticket. Multi-step equations work the same way. You're given a situation where a number has had several things done to it, and you need to figure out what that number was by carefully undoing each operation, one at a time, until you get the answer.",
  },
  {
    id: "s5",
    slug: "variables_both_sides",
    name: "Variables on both sides",
    tier: "not_attempted",
    flagged: false,
    progressDetail: "Not reached yet.",
    source: "Grade 8 Algebra Curriculum Guide, Unit 3",
    lesson:
      "Imagine you and your friend are both collecting video game points, and you want to know when you'll have the same score. You might start with some points already, then earn more each round—and so does your friend. To figure out when your scores match, you need to think about what's happening on both sides at the same time. This is like solving a two-step equation, where you undo operations one at a time to find what a number is, except now you have the variable (the unknown) showing up in more than one place. The trick is to move all the variables to one side first, like gathering all your points in one pile and your friend's points in another pile, so you can actually compare them. Once the variables are all on one side, you'll solve it just like a two-step equation by undoing addition or subtraction, then undoing multiplication or division. The main new skill is recognizing that you can move variables around before you start simplifying, and that makes finding the answer possible.",
  },
  {
    id: "s6",
    slug: "inequalities",
    name: "Inequalities",
    tier: "not_attempted",
    flagged: false,
    progressDetail: "Not reached yet.",
    source: "Grade 8 Algebra Curriculum Guide, Unit 4",
    lesson:
      "Imagine you're saving up for a concert ticket that costs $60, and you're adding money to your piggy bank each week. An inequality is like asking 'Will I have enough money?' instead of 'Will I have exactly $60?' — the answer might be 'yes, I'll have more than $60' or 'I might have less.' When you solve inequalities, you're doing almost the same moves as when you had variables on both sides of an equals sign — moving numbers around and combining like terms to figure out what values work — except now instead of finding one exact answer, you're finding a range of answers. For example, if you earn $8 per week and you've already saved $12, you might ask 'After how many weeks will I have more than $60?' That's an inequality, and solving it uses all those same skills of getting your variable by itself. The big new thing is that instead of an equals sign, you'll see symbols like > (greater than) or < (less than), which means your answer isn't just one number — it's a whole group of numbers that make the statement true.",
  },
];

/**
 * Direct-prerequisite edges that don't follow simple list order. Variables on
 * both sides bridges back to two-step equations, not to the skill immediately
 * before it. Practice Session's first-exposure bridging depends on this too.
 */
export const PREREQUISITE_OVERRIDES: Record<string, string> = { s5: "s3" };

export function prerequisiteOf(id: string): Skill | null {
  const overrideId = PREREQUISITE_OVERRIDES[id];
  if (overrideId) return SKILLS.find((s) => s.id === overrideId) ?? null;
  const idx = SKILLS.findIndex((s) => s.id === id);
  return idx > 0 ? SKILLS[idx - 1] : null;
}

export const TIER_STYLE: Record<MasteryTier, TierStyle> = {
  not_attempted: {
    label: "Not attempted",
    dotBg: "oklch(88% 0.014 55)",
    dotBorder: "1px solid oklch(88% 0.014 55)",
    badgeBg: "oklch(93% 0.008 55)",
    badgeColor: "oklch(49% 0.018 55)",
  },
  struggling: {
    label: "Struggling",
    dotBg: "oklch(58% 0.11 25)",
    dotBorder: "none",
    badgeBg: "oklch(95% 0.03 25)",
    badgeColor: "oklch(45% 0.11 25)",
  },
  emerging: {
    label: "Emerging",
    dotBg: "oklch(63% 0.10 60)",
    dotBorder: "none",
    badgeBg: "oklch(95% 0.03 60)",
    badgeColor: "oklch(45% 0.10 60)",
  },
  tentative: {
    label: "Tentative",
    dotBg: "oklch(68% 0.09 100)",
    dotBorder: "none",
    badgeBg: "oklch(95% 0.025 100)",
    badgeColor: "oklch(42% 0.09 100)",
  },
  durable: {
    label: "Durable",
    dotBg: "oklch(60% 0.10 150)",
    dotBorder: "none",
    badgeBg: "oklch(93% 0.03 150)",
    badgeColor: "oklch(38% 0.10 150)",
  },
};

/** Next spaced-repetition review, consistent with Today/Week's Friday item. */
export const NEXT_REVIEW = {
  skillName: "One-step equations",
  whenLabel: "in 2 days",
  note: "A quick check-in to help this one stick for good.",
};
