/* Seeds one worked example so a fresh container has something to look at.
   Safe to re-run: it skips if any project already exists. */
import * as repo from "./repo.js";

if (repo.listProjects().length > 0) {
  console.log("seed: projects already present, nothing to do");
  process.exit(0);
}

const project = repo.createProject({
  name: "DSOPS — Gamsberg rollout",
  client: "Nsimbi Mining",
  description:
    "Requirements gathering for the DSOPS deployment at Gamsberg: reporting scope, data capture at the rig, and site connectivity.",
  status: "active",
});

const topics = [
  {
    title: "Reporting scope",
    objective:
      "Agree exactly which figures the monthly site report must carry, and who signs each one off.",
    questions: [
      {
        body: "Which figures in the current July workbook are contractual, and which are internal only?",
        counters: [
          "If rate-per-metre is contractual, does the client see the modelled figure or the invoiced one?",
        ],
      },
      { body: "Who signs off the monthly report before it leaves site?", counters: [] },
    ],
  },
  {
    title: "Rig-side data capture",
    objective:
      "Establish what an operator can realistically record per shift without slowing the rig down.",
    questions: [
      {
        body: "What does the operator record today, on paper or otherwise, at the end of a shift?",
        counters: ["How long does that take them, and what gets skipped when the shift runs late?"],
      },
    ],
  },
  {
    title: "Site connectivity",
    objective: "Determine whether the field app must work fully offline at Gamsberg.",
    questions: [{ body: "Where on site is there no usable signal during a normal shift?", counters: [] }],
  },
];

for (const t of topics) {
  const topic = repo.createTopic(project.id, { title: t.title, objective: t.objective });
  for (const q of t.questions) {
    const question = repo.createQuestion(topic.id, { body: q.body, author: "Ross Beukes" });
    for (const c of q.counters) {
      repo.createQuestion(topic.id, { body: c, author: "Ross Beukes", parent_id: question.id });
    }
  }
}

console.log(`seed: created project ${project.id} with ${topics.length} topics`);
