const fs = require('fs');
const path = require('path');

// Load all brain files
const loadJSON = (file) => {
return JSON.parse(
fs.readFileSync(path.join(__dirname, 'brain', file), 'utf-8')
);
};

const canonical = loadJSON('canonical_chores_full.json');
const rules = loadJSON('rules_engine.json');
const profile = loadJSON('profile_schema.json');
const state = loadJSON('household_state.json');
const normalization = loadJSON('Normalization_map.json');
const intent = loadJSON('intent_signal.json');

// --- STEP 1: Normalize input ---
function normalizeInput(input) {
const lower = input.toLowerCase();

for (let map of normalization.common_mappings) {
for (let variant of map.input_variants) {
if (lower.includes(variant)) {
return map.canonical_chore_id;
}
}
}

return null;
}

// --- STEP 2: Find chore ---
function getChore(choreId) {
return canonical.chores?.find(c => c.id === choreId) || null;
}

// --- STEP 3: Apply rules ---
function applyRules(chore) {
if (!chore) return null;

return {
tier: chore.tier || 1,
points: (rules.scoring_engine?.points_by_tier || {})[chore.tier] || 5,
advice: chore.tier >= 2 ? ["Start early to avoid delay"] : []
};
}

// --- STEP 4: Get intent ---
function getIntent(choreId) {
const match = intent.chore_intent_mapping?.find(c => c.canonical_chore_id === choreId);
return match?.intents || [];
}

// --- STEP 5: Run full system ---
function run(input) {
console.log("\nINPUT:", input);

const choreId = normalizeInput(input);
if (!choreId) {
return { error: "Could not map input" };
}

const chore = getChore(choreId);
const ruleResult = applyRules(chore);
const intents = getIntent(choreId);

return {
task: {
task_id: "task_" + Date.now(),
canonical_chore_id: choreId,
title: chore?.title || input,
assigned_to: "user_1",
tier: ruleResult.tier,
points: ruleResult.points,
status: "created"
},
advice: {
enabled: ruleResult.advice.length > 0,
messages: ruleResult.advice
},
intent: {
intents: intents
}
};
}

// --- TEST ---
const result = run("clean litter box");
console.log("\nOUTPUT:\n", JSON.stringify(result, null, 2));
