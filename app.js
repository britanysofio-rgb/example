/*
 * ToxCase — toxicology case generator with a pharmacotherapy focus.
 *
 * Each toxin defines a toxidrome (history/vitals/labs shift) plus the
 * pharmacotherapy plan students should arrive at. Cases randomize the
 * patient, dose, and timeline, then compute weight-based antidote dosing
 * for the generated patient so the numbers are internally consistent.
 *
 * Two modes:
 *   - "unknown" (empiric): the history withholds the substance and the
 *     drug-identifying confirmatory labs (e.g. "Acetaminophen level") are
 *     hidden from the case and revealed only in the answer. The learner
 *     recognizes the toxidrome, treats empirically, and names the toxin.
 *   - "known": the history names the substance and all labs are shown.
 *
 * Teaching reference only — see the footer disclaimer.
 */

// ---- Randomization helpers -------------------------------------------------
const rnd = (min, max) => Math.random() * (max - min) + min;
const rint = (min, max) => Math.floor(rnd(min, max + 1));
const pick = (arr) => arr[rint(0, arr.length - 1)];
const round = (n, dp = 0) => {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
};

const FIRST_NAMES_F = ["Maria", "Aisha", "Chen", "Priya", "Sofia", "Grace", "Lena", "Fatima", "Naomi", "Rosa"];
const FIRST_NAMES_M = ["James", "Omar", "Diego", "Kwame", "Liam", "Yusuf", "Noah", "Andre", "Hassan", "Ravi"];

// ---- Toxin / toxidrome dataset --------------------------------------------
// Ranges are written as [low, high] and sampled to build a coherent picture.
// Labs marked `confirmatory: true` name/identify the toxin and are hidden in
// "unknown" mode (they "return later").  story = named history; blindStory =
// empiric history with the substance withheld.
const TOXINS = [
  {
    id: "acetaminophen",
    name: "Acetaminophen (paracetamol) overdose",
    category: "Analgesic",
    difficulty: 1,
    agents: ["extra-strength acetaminophen tablets", "a combination cold-and-flu product", "acetaminophen/opioid tablets"],
    story: (p) => `${p.name} was found at home after an intentional ingestion of ${p.agentAmount} of ${p.agent}. ${p.pronounSubjectCap} initially felt well but now, ${p.hoursAgo} hours later, reports nausea, vomiting, and right-upper-quadrant discomfort.`,
    blindStory: (p) => `${p.name} is brought in after a suspected intentional overdose ${p.hoursAgo} hours ago; the substance and amount are unknown. ${p.pronounSubjectCap} felt well at first but now reports nausea, repeated vomiting, and right-upper-quadrant discomfort.`,
    complaint: "Nausea, vomiting, and right-upper-quadrant pain after an intentional overdose",
    blindComplaint: "Nausea, vomiting, and right-upper-quadrant pain hours after a suspected overdose",
    vitals: { hr: [70, 95], sbp: [110, 130], rr: [14, 18], temp: [36.6, 37.2], spo2: [97, 100] },
    labs: [
      { k: "AST", low: 45, high: 900, unit: "U/L", abnHigh: 40 },
      { k: "ALT", low: 55, high: 1100, unit: "U/L", abnHigh: 40 },
      { k: "INR", low: 1.2, high: 2.4, unit: "", dp: 1, abnHigh: 1.2 },
      { k: "Acetaminophen level", low: 120, high: 260, unit: "mcg/mL", abnHigh: 20, confirmatory: true },
    ],
    findings: ["RUQ tenderness on palpation", "Mild scleral icterus in later presentations", "Otherwise unremarkable exam"],
    toxidrome: "No classic toxidrome early — often deceptively well before hepatotoxicity",
    diagnosis: "Acetaminophen poisoning with evolving hepatotoxicity; plot the 4-hour level on the Rumack–Matthew nomogram.",
    workup: [
      "Timed serum acetaminophen level (interpret at ≥4 h post-ingestion on the Rumack–Matthew nomogram)",
      "AST/ALT, bilirubin, INR/PT, BMP, venous pH/lactate",
      "Consider co-ingestants: salicylate level, ECG, glucose",
    ],
    pharm: {
      antidote: "N-acetylcysteine (NAC)",
      mechanism: "Replenishes hepatic glutathione and directly scavenges the toxic metabolite NAPQI.",
      dosing: (p) => {
        const load = round(150 * p.weightKg);
        const d2 = round(50 * p.weightKg);
        const d3 = round(100 * p.weightKg);
        return [
          { drug: "NAC — loading dose", dose: `150 mg/kg IV over 60 min = ${load} mg for ${p.weightKg} kg` },
          { drug: "NAC — 2nd bag", dose: `50 mg/kg over 4 h = ${d2} mg` },
          { drug: "NAC — 3rd bag", dose: `100 mg/kg over 16 h = ${d3} mg` },
        ];
      },
      supportive: ["Antiemetics (ondansetron) for vomiting", "Correct coagulopathy only if bleeding; involve hepatology/transplant early if INR rises", "Do NOT delay NAC waiting for the level if presentation is late or the timeline is unknown"],
      pitfalls: "Start NAC empirically if the ingestion is >8 h ago or the timing is uncertain — hepatoprotection falls sharply after 8 hours.",
    },
  },
  {
    id: "opioid",
    name: "Opioid overdose",
    category: "Opioid",
    difficulty: 1,
    agents: ["oxycodone tablets", "heroin", "fentanyl-contaminated pills", "methadone"],
    story: (p) => `Paramedics bring ${p.name} in after ${p.pronounSubject} was found unresponsive with a slow respiratory rate. Bystanders report ${p.pronounObject} using ${p.agent}. A used naloxone kit was nearby but empty.`,
    blindStory: (p) => `Paramedics bring ${p.name} in after ${p.pronounSubject} was found unresponsive with a slow respiratory rate. There is no reliable history of what was taken or of any medical background.`,
    complaint: "Unresponsive with shallow, slow breathing",
    blindComplaint: "Unresponsive with shallow, slow breathing",
    vitals: { hr: [40, 62], sbp: [90, 110], rr: [4, 9], temp: [36.0, 36.8], spo2: [80, 90] },
    labs: [
      { k: "Venous pCO2", low: 55, high: 78, unit: "mmHg", abnHigh: 45 },
      { k: "Venous pH", low: 7.15, high: 7.31, unit: "", dp: 2, abnLow: 7.35 },
      { k: "Glucose", low: 80, high: 120, unit: "mg/dL" },
    ],
    findings: ["Pinpoint (miotic) pupils", "Depressed level of consciousness (GCS 6–9)", "Shallow, slow respirations; possible track marks"],
    toxidrome: "Opioid toxidrome: CNS depression, respiratory depression, miosis",
    diagnosis: "Acute opioid toxicity with hypoventilation — the immediate threat is respiratory, not sedation.",
    workup: [
      "Bedside glucose (rule out hypoglycemia as a cause of AMS)",
      "Venous blood gas to confirm hypercapnia",
      "ECG (methadone → QT prolongation); consider acetaminophen/salicylate if co-ingestion suspected",
    ],
    pharm: {
      antidote: "Naloxone",
      mechanism: "Competitive opioid receptor antagonist; reverses respiratory depression within 1–2 minutes.",
      dosing: (p) => [
        { drug: "Naloxone — initial", dose: `0.04–0.4 mg IV/IM/IN, titrate to adequate respirations (not full arousal). Repeat q2–3 min, escalating to 2 mg if no response.` },
        { drug: "Naloxone — infusion", dose: `If repeated dosing needed: give two-thirds of the effective waking dose per hour (e.g. ${round(rnd(0.2, 0.6), 2)} mg/h) and titrate.` },
      ],
      supportive: ["Bag-valve-mask ventilation with 100% O2 while naloxone takes effect", "Observe ≥4–6 h after the last naloxone dose (longer for long-acting agents like methadone)", "Anticipate acute withdrawal; titrate to respiration to avoid precipitating it"],
      pitfalls: "Long-acting opioids outlast a single naloxone dose — recurrent respiratory depression is the classic trap. Plan for an infusion or extended observation.",
    },
  },
  {
    id: "tca",
    name: "Tricyclic antidepressant overdose",
    category: "Antidepressant",
    difficulty: 3,
    agents: ["amitriptyline tablets", "nortriptyline capsules", "a bottle of dosulepin"],
    story: (p) => `${p.name} presents ${p.hoursAgo} hours after ingesting ${p.agentAmount} of ${p.agent}. ${p.pronounSubjectCap} is now drowsy and confused, and on the monitor you notice a widening QRS.`,
    blindStory: (p) => `${p.name} is brought in ${p.hoursAgo} hours after a suspected overdose of unidentified pills. ${p.pronounSubjectCap} is now drowsy and confused, and on the monitor you notice a widening QRS.`,
    complaint: "Altered mental status and a wide-complex rhythm after antidepressant overdose",
    blindComplaint: "Altered mental status with a wide-complex rhythm after an unknown overdose",
    vitals: { hr: [110, 140], sbp: [80, 100], rr: [16, 22], temp: [37.0, 38.2], spo2: [94, 99] },
    labs: [
      { k: "QRS duration", low: 110, high: 175, unit: "ms", abnHigh: 100 },
      { k: "Serum pH", low: 7.20, high: 7.34, unit: "", dp: 2, abnLow: 7.35 },
      { k: "Potassium", low: 3.4, high: 4.2, unit: "mmol/L" },
      { k: "Bicarbonate", low: 15, high: 20, unit: "mmol/L", abnLow: 22 },
    ],
    findings: ["Dry, flushed skin; dilated pupils; urinary retention (anticholinergic)", "Depressed consciousness, may seize", "ECG: wide QRS, terminal R wave in aVR, tachycardia"],
    toxidrome: "Anticholinergic features plus sodium-channel blockade (wide QRS) and hypotension",
    diagnosis: "TCA cardiotoxicity — sodium-channel blockade with QRS widening; risk of seizures and ventricular dysrhythmia.",
    workup: [
      "Continuous ECG; QRS >100 ms predicts seizures, QRS >160 ms predicts ventricular arrhythmia",
      "ABG/VBG, electrolytes (especially K+), glucose",
      "Look for the terminal R wave in aVR (>3 mm) and R/S ratio in aVR >0.7",
    ],
    pharm: {
      antidote: "Sodium bicarbonate (hypertonic)",
      mechanism: "Sodium load overcomes fast-Na-channel blockade; alkalinization reduces free drug binding to the channel. Target serum pH 7.50–7.55.",
      dosing: (p) => {
        const bolus = round(1.5 * p.weightKg);
        return [
          { drug: "Sodium bicarbonate — bolus", dose: `1–2 mEq/kg IV push ≈ ${bolus} mEq; repeat for QRS >100 ms or hypotension until QRS narrows` },
          { drug: "Bicarbonate infusion", dose: `150 mEq (3 amps) in 1 L D5W at 2–3 mL/kg/h, titrate to serum pH 7.50–7.55` },
        ];
      },
      supportive: ["Benzodiazepines for seizures (avoid phenytoin)", "Norepinephrine for refractory hypotension after fluids", "Lipid emulsion or ECMO for refractory cardiotoxicity"],
      pitfalls: "Avoid class Ia/Ic and class III antiarrhythmics and physostigmine — they worsen cardiotoxicity. Bicarbonate, not lidocaine, is first-line.",
    },
  },
  {
    id: "benzodiazepine",
    name: "Benzodiazepine overdose",
    category: "Sedative-hypnotic",
    difficulty: 1,
    agents: ["diazepam tablets", "alprazolam tablets", "clonazepam tablets"],
    story: (p) => `${p.name} is brought in sedated and slurring after taking ${p.agentAmount} of ${p.agent}. ${p.pronounSubjectCap} is rousable to voice but keeps drifting off. Vital signs are relatively preserved.`,
    blindStory: (p) => `${p.name} is brought in sedated and slurring after an unwitnessed ingestion of an unknown substance. ${p.pronounSubjectCap} is rousable to voice but keeps drifting off. Vital signs are relatively preserved.`,
    complaint: "Sedation and slurred speech after sedative ingestion",
    blindComplaint: "Sedation and slurred speech after an unwitnessed ingestion",
    vitals: { hr: [60, 80], sbp: [100, 120], rr: [12, 16], temp: [36.4, 37.0], spo2: [94, 99] },
    labs: [
      { k: "Venous pCO2", low: 44, high: 55, unit: "mmHg", abnHigh: 45 },
      { k: "Glucose", low: 85, high: 115, unit: "mg/dL" },
      { k: "Ethanol", low: 0, high: 180, unit: "mg/dL" },
    ],
    findings: ["Somnolence, ataxia, slurred speech", "Normal or near-normal pupils", "Preserved vitals unless co-ingestants present"],
    toxidrome: "Sedative-hypnotic toxidrome: CNS depression with relatively preserved vitals",
    diagnosis: "Isolated benzodiazepine toxicity — usually benign; danger lies in co-ingestants (opioids, alcohol) causing respiratory depression.",
    workup: [
      "Screen for co-ingestants: ethanol level, acetaminophen, salicylate, ECG",
      "Bedside glucose and venous gas if hypoventilating",
      "Mostly a clinical diagnosis with supportive observation",
    ],
    pharm: {
      antidote: "Flumazenil (use is highly selective)",
      mechanism: "Competitive GABA-A benzodiazepine-site antagonist; reverses sedation.",
      dosing: () => [
        { drug: "Flumazenil", dose: "0.2 mg IV over 30 s, repeat to a max of ~1 mg — only in a naive patient with pure benzodiazepine ingestion" },
      ],
      supportive: ["Supportive care and airway monitoring is the mainstay", "Reserve flumazenil for iatrogenic oversedation in benzodiazepine-naive patients", "Position and observe; most recover with time"],
      pitfalls: "Avoid flumazenil in chronic users or mixed overdoses — it can precipitate refractory seizures and unmask TCA cardiotoxicity.",
    },
  },
  {
    id: "organophosphate",
    name: "Organophosphate / cholinergic poisoning",
    category: "Pesticide",
    difficulty: 2,
    agents: ["an organophosphate insecticide", "a carbamate pesticide", "malathion concentrate"],
    story: (p) => `A farm worker, ${p.name}, is brought in after occupational exposure to ${p.agent}. ${p.pronounSubjectCap} is drooling, sweating profusely, and has vomited several times. Staff note a garlic-like odor and copious secretions.`,
    blindStory: (p) => `A farm worker, ${p.name}, collapses in the field and is brought in acutely ill; the exposure is unclear. ${p.pronounSubjectCap} is drooling, sweating profusely, and has vomited several times. Staff note a garlic-like odor and copious secretions.`,
    complaint: "Profuse secretions, sweating, and vomiting after pesticide exposure",
    blindComplaint: "Profuse secretions, sweating, and vomiting after collapsing at work",
    vitals: { hr: [42, 58], sbp: [90, 110], rr: [22, 30], temp: [36.6, 37.4], spo2: [86, 93] },
    labs: [
      { k: "RBC acetylcholinesterase", low: 10, high: 45, unit: "% of normal", abnLow: 80, confirmatory: true },
      { k: "Venous pH", low: 7.20, high: 7.33, unit: "", dp: 2, abnLow: 7.35 },
      { k: "Glucose", low: 90, high: 160, unit: "mg/dL" },
    ],
    findings: ["SLUDGE/DUMBELS: salivation, lacrimation, urination, defecation, GI cramps, emesis", "Bronchorrhea and bronchospasm — the killer feature", "Miosis, muscle fasciculations, bradycardia"],
    toxidrome: "Cholinergic toxidrome (muscarinic + nicotinic)",
    diagnosis: "Cholinergic crisis from acetylcholinesterase inhibition; death is from respiratory failure due to bronchorrhea and weakness.",
    workup: [
      "RBC (and plasma) cholinesterase activity",
      "Decontaminate: remove clothing, wash skin; protect staff with PPE",
      "Continuous monitoring; watch for the intermediate syndrome (24–96 h weakness)",
    ],
    pharm: {
      antidote: "Atropine + pralidoxime",
      mechanism: "Atropine antagonizes muscarinic effects (dries secretions); pralidoxime reactivates acetylcholinesterase before aging, addressing nicotinic effects.",
      dosing: (p) => {
        const pam = round(30 * p.weightKg);
        return [
          { drug: "Atropine", dose: "1–3 mg IV, then double every 3–5 min until secretions/bronchorrhea dry (titrate to lungs, not heart rate)" },
          { drug: "Pralidoxime (2-PAM)", dose: `30 mg/kg IV load ≈ ${pam} mg (max 2 g) over 30 min, then 8 mg/kg/h infusion` },
        ];
      },
      supportive: ["Airway control and oxygen; suction secretions aggressively", "Benzodiazepines for seizures/agitation", "Endpoint of atropine is a dry chest, not tachycardia or pupil size"],
      pitfalls: "Titrate atropine to clearing of bronchorrhea. Give pralidoxime early — once the enzyme 'ages', reactivation fails.",
    },
  },
  {
    id: "salicylate",
    name: "Salicylate (aspirin) poisoning",
    category: "Analgesic",
    difficulty: 2,
    agents: ["aspirin tablets", "oil of wintergreen (methyl salicylate)", "bismuth subsalicylate"],
    story: (p) => `${p.name} presents ${p.hoursAgo} hours after ingesting ${p.agentAmount} of ${p.agent}, complaining of ringing in the ears and rapid breathing. ${p.pronounSubjectCap} appears anxious, diaphoretic, and hyperventilating.`,
    blindStory: (p) => `${p.name} presents ${p.hoursAgo} hours after a suspected overdose of an unknown agent, complaining of ringing in the ears and rapid breathing. ${p.pronounSubjectCap} appears anxious, diaphoretic, and hyperventilating.`,
    complaint: "Tinnitus, hyperventilation, and diaphoresis",
    blindComplaint: "Tinnitus, hyperventilation, and diaphoresis",
    vitals: { hr: [100, 125], sbp: [105, 125], rr: [26, 36], temp: [37.6, 39.0], spo2: [96, 100] },
    labs: [
      { k: "Salicylate level", low: 45, high: 95, unit: "mg/dL", abnHigh: 30, confirmatory: true },
      { k: "Arterial pH", low: 7.42, high: 7.52, unit: "", dp: 2, abnHigh: 7.45 },
      { k: "Bicarbonate", low: 12, high: 18, unit: "mmol/L", abnLow: 22 },
      { k: "Anion gap", low: 16, high: 24, unit: "", abnHigh: 12 },
    ],
    findings: ["Tinnitus and hyperventilation", "Diaphoresis and hyperthermia", "Mixed acid-base: respiratory alkalosis + high-anion-gap metabolic acidosis"],
    toxidrome: "Salicylate toxidrome: mixed respiratory alkalosis and metabolic acidosis",
    diagnosis: "Salicylate poisoning — the mixed acid-base picture is the fingerprint; falling pH signals a critical, worsening patient.",
    workup: [
      "Serial salicylate levels (they can keep rising with bezoar/enteric-coated formulations)",
      "ABG, electrolytes with anion gap, glucose (keep serum + CSF glucose up)",
      "Acetaminophen level for co-ingestion",
    ],
    pharm: {
      antidote: "Sodium bicarbonate (urinary + serum alkalinization)",
      mechanism: "Alkalinization ion-traps salicylate in blood (out of the CNS) and in urine (enhancing excretion). Target urine pH 7.5–8.",
      dosing: (p) => {
        const bolus = round(1.5 * p.weightKg);
        return [
          { drug: "Sodium bicarbonate — bolus", dose: `1–2 mEq/kg IV ≈ ${bolus} mEq` },
          { drug: "Bicarbonate infusion", dose: "150 mEq in 1 L D5W + 40 mEq KCl at 1.5–2× maintenance; titrate urine pH 7.5–8" },
          { drug: "Hemodialysis", dose: "For level >90–100 mg/dL, altered mental status, refractory acidosis, or pulmonary/cerebral edema" },
        ];
      },
      supportive: ["Aggressive potassium repletion — you cannot alkalinize the urine while hypokalemic", "Glucose even if serum glucose is normal (CNS neuroglycopenia)", "Avoid intubation if possible; if unavoidable, match the patient's high minute ventilation"],
      pitfalls: "Intubating a salicylate patient can be lethal — losing their compensatory hyperventilation drops the pH and drives salicylate into the brain.",
    },
  },
  {
    id: "co",
    name: "Carbon monoxide poisoning",
    category: "Gas / asphyxiant",
    difficulty: 2,
    agents: ["a faulty gas furnace", "a running car in a closed garage", "a charcoal grill used indoors"],
    story: (p) => `${p.name} and family members present with headache, nausea, and dizziness after spending the night in a home with ${p.agent}. ${p.pronounSubjectCap} feels confused and reports the pulse oximeter at triage reads a reassuring 99%.`,
    blindStory: (p) => `${p.name} and several family members present together with headache, nausea, and dizziness after being found unwell at home. ${p.pronounSubjectCap} feels confused, and the triage pulse oximeter reads a reassuring 99%.`,
    complaint: "Headache, dizziness, and confusion with a normal-looking pulse oximetry",
    blindComplaint: "Headache, dizziness, and confusion — with a reassuring pulse oximetry — in several household members",
    vitals: { hr: [95, 115], sbp: [110, 130], rr: [18, 24], temp: [36.6, 37.2], spo2: [97, 100] },
    labs: [
      { k: "Carboxyhemoglobin (COHb)", low: 22, high: 40, unit: "%", abnHigh: 3, confirmatory: true },
      { k: "Lactate", low: 3.0, high: 7.0, unit: "mmol/L", dp: 1, abnHigh: 2.0 },
      { k: "Venous pH", low: 7.25, high: 7.35, unit: "", dp: 2, abnLow: 7.35 },
    ],
    findings: ["Headache, nausea, dizziness, confusion", "Falsely normal SpO2 on standard pulse oximetry (it reads the bound hemoglobin as oxygenated)", "Multiple people from the same environment affected"],
    toxidrome: "Cellular asphyxiant — impaired O2 delivery and utilization despite 'normal' pulse ox",
    diagnosis: "Carbon monoxide poisoning; standard pulse oximetry is falsely reassuring — measure carboxyhemoglobin directly.",
    workup: [
      "Co-oximetry (venous or arterial) for carboxyhemoglobin — not standard SpO2",
      "ECG and troponin (myocardial ischemia), lactate",
      "Consider concurrent cyanide toxicity in enclosed-space fires",
    ],
    pharm: {
      antidote: "High-flow oxygen (± hyperbaric O2)",
      mechanism: "Oxygen competitively displaces CO from hemoglobin; it shortens the COHb half-life from ~5 h (room air) to ~90 min (100% O2) to ~20 min (hyperbaric).",
      dosing: () => [
        { drug: "100% oxygen", dose: "Non-rebreather at 15 L/min; continue until COHb <5% and symptoms resolve" },
        { drug: "Hyperbaric oxygen", dose: "Consider for COHb >25%, loss of consciousness, neuro deficits, ischemic ECG, or pregnancy" },
      ],
      supportive: ["Remove from source; treat all exposed occupants", "Monitor for delayed neuropsychiatric sequelae at follow-up", "In fire victims, empirically treat for cyanide if acidotic/hypotensive"],
      pitfalls: "Don't trust the pulse oximeter — it reads COHb as oxyhemoglobin. A '99%' saturation does not exclude severe CO poisoning.",
    },
  },
  {
    id: "sulfonylurea",
    name: "Sulfonylurea overdose (hypoglycemia)",
    category: "Antidiabetic",
    difficulty: 2,
    agents: ["glipizide tablets", "glyburide tablets", "a relative's glimepiride"],
    story: (p) => `${p.name} is found diaphoretic and confused after taking ${p.agentAmount} of ${p.agent}. A bedside glucose reads ${p.glucose} mg/dL. ${p.pronounSubjectCap} improves briefly with juice but becomes drowsy again.`,
    blindStory: (p) => `${p.name} is found diaphoretic and confused after a possible ingestion of unknown pills. A bedside glucose reads ${p.glucose} mg/dL. ${p.pronounSubjectCap} improves briefly with juice and IV dextrose but becomes drowsy and hypoglycemic again.`,
    complaint: "Recurrent hypoglycemia with confusion and diaphoresis",
    blindComplaint: "Recurrent hypoglycemia with confusion and diaphoresis after an unknown ingestion",
    vitals: { hr: [95, 120], sbp: [110, 135], rr: [16, 20], temp: [36.4, 37.0], spo2: [97, 100] },
    labs: [
      { k: "Glucose (recurrent)", low: 32, high: 52, unit: "mg/dL", abnLow: 70 },
      { k: "C-peptide", low: 3.5, high: 7.0, unit: "ng/mL", dp: 1, abnHigh: 3.0, confirmatory: true },
      { k: "Potassium", low: 3.2, high: 3.8, unit: "mmol/L" },
    ],
    findings: ["Diaphoresis, tremor, confusion; may seize with severe hypoglycemia", "Symptoms recur after dextrose boluses", "Recurrent hypoglycemia despite dextrose — an endogenous hyperinsulinism pattern"],
    toxidrome: "Endogenous hyperinsulinemic hypoglycemia",
    diagnosis: "Sulfonylurea-induced hypoglycemia — the danger is recurrence; dextrose alone is a temporizing measure, not a cure.",
    workup: [
      "Serial bedside glucose (recurrence is the rule for many hours)",
      "Insulin and C-peptide (both elevated distinguishes from exogenous insulin)",
      "Admit for observation — long-acting agents cause prolonged hypoglycemia",
    ],
    pharm: {
      antidote: "Octreotide (+ dextrose)",
      mechanism: "Octreotide suppresses pancreatic insulin release, preventing the rebound hypoglycemia that dextrose paradoxically drives by stimulating more insulin.",
      dosing: (p) => {
        const dex = round(0.5 * p.weightKg * 2); // mL of D50 approx (0.5-1 g/kg)
        return [
          { drug: "Dextrose (acute)", dose: `D50 25–50 mL IV to correct symptomatic hypoglycemia (~${dex} mL for this patient); repeat PRN` },
          { drug: "Octreotide", dose: "50–100 mcg SC/IV every 6–8 h to suppress insulin release" },
        ];
      },
      supportive: ["Frequent glucose checks; do not discharge early", "Encourage oral intake once alert", "Consider glucagon only as a bridge — it also stimulates insulin and is short-lived"],
      pitfalls: "Repeated dextrose boluses stimulate more insulin, worsening rebound lows. Octreotide breaks the cycle; observe for 24 h with long-acting agents.",
    },
  },
  {
    id: "digoxin",
    name: "Digoxin toxicity",
    category: "Cardiac glycoside",
    difficulty: 3,
    agents: ["chronic digoxin therapy plus a new diuretic", "an accidental double-dose of digoxin", "foxglove/oleander plant ingestion"],
    story: (p) => `${p.name}, on ${p.agent}, presents with nausea, blurred yellow-green vision, and palpitations. The monitor shows a slow, irregular rhythm and the potassium is climbing.`,
    blindStory: (p) => `${p.name}, an older patient on several cardiac medications ${p.pronounSubject} cannot fully name, presents with nausea, blurred yellow-green vision, and palpitations. The monitor shows a slow, irregular rhythm and the potassium is climbing.`,
    complaint: "Nausea, visual changes, and a bradydysrhythmia",
    blindComplaint: "Nausea, yellow-green visual changes, and a bradydysrhythmia with rising potassium",
    vitals: { hr: [38, 55], sbp: [95, 120], rr: [16, 20], temp: [36.5, 37.0], spo2: [96, 100] },
    labs: [
      { k: "Digoxin level", low: 3.2, high: 8.0, unit: "ng/mL", dp: 1, abnHigh: 2.0, confirmatory: true },
      { k: "Potassium", low: 5.4, high: 6.8, unit: "mmol/L", dp: 1, abnHigh: 5.0 },
      { k: "Creatinine", low: 1.4, high: 2.6, unit: "mg/dL", dp: 1, abnHigh: 1.2 },
    ],
    findings: ["GI upset, confusion, yellow-green visual halos", "Bradycardia with AV block or 'regularized' AF; classically bidirectional VT", "Hyperkalemia in acute toxicity signals severity"],
    toxidrome: "Cardiac glycoside toxicity (Na/K-ATPase inhibition)",
    diagnosis: "Digoxin toxicity — in acute poisoning the potassium level predicts mortality and guides antidote use.",
    workup: [
      "Digoxin level (interpret ≥6 h post-dose), potassium, renal function, magnesium",
      "Continuous ECG for blocks and dysrhythmias",
      "Identify precipitants: renal failure, hypokalemia from diuretics, drug interactions",
    ],
    pharm: {
      antidote: "Digoxin-specific antibody fragments (DigiFab)",
      mechanism: "Fab fragments bind free digoxin and the drug-receptor complex, rapidly reversing toxicity; renally cleared.",
      dosing: (p) => {
        const empiric = 10; // vials empiric in acute severe
        return [
          { drug: "DigoxinFab — acute/unknown, unstable", dose: `Empiric ${empiric} vials IV (repeat ${empiric} if no response); ${round(empiric/2)} vials if more stable` },
          { drug: "DigoxinFab — known level", dose: "Vials = (serum digoxin ng/mL × weight kg) / 100, rounded up" },
        ];
      },
      supportive: ["Atropine or temporary pacing for bradycardia while Fab works", "Treat hyperkalemia — but avoid calcium in chronic digoxin toxicity (theoretical 'stone heart')", "Correct magnesium"],
      pitfalls: "Hyperkalemia is treated by the Fab antidote itself. Avoid IV calcium in digoxin toxicity, and avoid class Ia antiarrhythmics.",
    },
  },
  {
    id: "methanol",
    name: "Methanol / toxic alcohol ingestion",
    category: "Toxic alcohol",
    difficulty: 3,
    agents: ["windshield washer fluid", "moonshine of uncertain origin", "an industrial solvent"],
    story: (p) => `${p.name} presents ${p.hoursAgo} hours after drinking ${p.agent}, now complaining of blurred vision described as 'like a snowstorm', headache, and abdominal pain. The anion gap is wide and vision is deteriorating.`,
    blindStory: (p) => `${p.name} presents ${p.hoursAgo} hours after drinking an unknown liquid, now complaining of blurred vision described as 'like a snowstorm', headache, and abdominal pain. The anion gap is wide and vision is deteriorating.`,
    complaint: "Visual disturbance ('snowstorm') and abdominal pain after drinking a non-beverage alcohol",
    blindComplaint: "Visual disturbance ('snowstorm') and abdominal pain with a wide anion gap",
    vitals: { hr: [95, 115], sbp: [105, 130], rr: [24, 32], temp: [36.6, 37.2], spo2: [97, 100] },
    labs: [
      { k: "Anion gap", low: 22, high: 34, unit: "", abnHigh: 12 },
      { k: "Osmolar gap", low: 18, high: 40, unit: "mOsm/kg", abnHigh: 10 },
      { k: "Arterial pH", low: 7.10, high: 7.28, unit: "", dp: 2, abnLow: 7.35 },
      { k: "Methanol level", low: 30, high: 90, unit: "mg/dL", abnHigh: 20, confirmatory: true },
    ],
    findings: ["Visual blurring / 'snowfield' vision, possible afferent pupillary defect", "Wide anion-gap metabolic acidosis with an osmolar gap", "Hyperventilation (Kussmaul), abdominal pain"],
    toxidrome: "Toxic alcohol: high anion gap + high osmolar gap metabolic acidosis",
    diagnosis: "Methanol poisoning — formic acid causes the acidosis and retinal toxicity; block metabolism before more is converted.",
    workup: [
      "Serum methanol/ethylene glycol levels, anion and osmolar gaps, ABG",
      "Ethanol level (co-ingestion protects; masks the gap)",
      "Ophthalmology involvement for visual toxicity",
    ],
    pharm: {
      antidote: "Fomepizole (+ folinic acid; hemodialysis)",
      mechanism: "Fomepizole inhibits alcohol dehydrogenase, blocking conversion of methanol to toxic formic acid. Folinic acid speeds formate metabolism.",
      dosing: (p) => [
        { drug: "Fomepizole — load", dose: "15 mg/kg IV over 30 min" + `  ≈ ${round(15 * p.weightKg)} mg` },
        { drug: "Fomepizole — maintenance", dose: `10 mg/kg q12h ≈ ${round(10 * p.weightKg)} mg (increase to 15 mg/kg after 48 h)` },
        { drug: "Folinic/folic acid", dose: "50 mg IV q4–6h to enhance formate clearance" },
      ],
      supportive: ["Hemodialysis for severe acidosis, visual symptoms, high levels, or renal failure", "Sodium bicarbonate for severe acidemia", "Ethanol infusion is the alternative ADH blocker if fomepizole is unavailable"],
      pitfalls: "Treat on suspicion — don't wait for a confirmatory level if the gap and history fit. Fomepizole and dialysis together are definitive.",
    },
  },
  {
    id: "betablocker_ccb",
    name: "Beta-blocker / calcium-channel-blocker overdose",
    category: "Cardiovascular",
    difficulty: 3,
    agents: ["metoprolol tablets", "diltiazem extended-release capsules", "amlodipine tablets"],
    story: (p) => `${p.name} presents ${p.hoursAgo} hours after ingesting ${p.agentAmount} of ${p.agent}, now hypotensive and bradycardic and not responding to a fluid bolus. ${p.pronounSubjectCap} is drowsy with cool extremities.`,
    blindStory: (p) => `${p.name} presents ${p.hoursAgo} hours after a suspected overdose of unknown cardiac medications, now hypotensive and bradycardic and not responding to a fluid bolus. ${p.pronounSubjectCap} is drowsy with cool extremities.`,
    complaint: "Refractory hypotension and bradycardia after a cardiovascular-drug overdose",
    blindComplaint: "Refractory hypotension and bradycardia unresponsive to fluids",
    vitals: { hr: [38, 55], sbp: [65, 85], rr: [14, 20], temp: [36.2, 36.8], spo2: [94, 99] },
    labs: [
      { k: "Glucose", low: 160, high: 300, unit: "mg/dL", abnHigh: 140 },
      { k: "Lactate", low: 3.0, high: 6.5, unit: "mmol/L", dp: 1, abnHigh: 2.0 },
      { k: "Venous pH", low: 7.22, high: 7.33, unit: "", dp: 2, abnLow: 7.35 },
    ],
    findings: ["Bradycardia and hypotension refractory to fluids", "Hyperglycemia (marked with CCBs — insulin release is blocked)", "Altered mental status, cool peripheries"],
    toxidrome: "Cardiovascular collapse: bradycardia + hypotension (± hyperglycemia with CCBs)",
    diagnosis: "Beta-blocker / calcium-channel-blocker toxicity — myocardial depression and vasodilation; extended-release forms cause delayed, prolonged toxicity.",
    workup: [
      "Continuous ECG and blood pressure monitoring; glucose (hyperglycemia hints at CCB)",
      "Consider whole-bowel irrigation for extended-release ingestions",
      "Early central access — pressors and high-dose insulin are coming",
    ],
    pharm: {
      antidote: "High-dose insulin euglycemia therapy (HIE) + calcium",
      mechanism: "High-dose insulin is an inotrope that improves myocardial glucose uptake and contractility; calcium overcomes channel blockade; glucagon raises cAMP.",
      dosing: (p) => {
        const load = round(1 * p.weightKg);
        const infusionLow = round(0.5 * p.weightKg, 1);
        return [
          { drug: "Insulin (HIE) — bolus", dose: `1 unit/kg IV regular insulin ≈ ${load} units, with 25–50 g dextrose` },
          { drug: "Insulin (HIE) — infusion", dose: `0.5–1 unit/kg/h ≈ ${infusionLow}–${round(1*p.weightKg,1)} units/h, titrate up; run dextrose to keep glucose 100–250` },
          { drug: "Calcium", dose: "Calcium gluconate 3 g (30 mL of 10%) or calcium chloride 1 g IV, repeat q10–20 min" },
          { drug: "Glucagon", dose: "3–5 mg IV bolus (esp. beta-blocker), then infusion if it works" },
        ];
      },
      supportive: ["Vasopressors (norepinephrine/epinephrine) for shock", "Atropine and pacing are often ineffective but worth trying", "Lipid emulsion or VA-ECMO for refractory cardiogenic shock"],
      pitfalls: "Don't under-dose insulin — HIE is a mainstay, not a last resort, and must run with close glucose/potassium monitoring.",
    },
  },
  {
    id: "iron",
    name: "Iron overdose",
    category: "Metal",
    difficulty: 2,
    agents: ["adult ferrous sulfate tablets", "prenatal iron supplements", "a bottle of iron-containing vitamins"],
    story: (p) => `${p.name} presents after ingesting ${p.agentAmount} of ${p.agent}. ${p.pronounSubjectCap} has had repeated vomiting and now bloody diarrhea, with abdominal pain and lethargy. An abdominal film shows radiopaque tablets.`,
    blindStory: (p) => `${p.name} presents after a suspected ingestion of unknown tablets. ${p.pronounSubjectCap} has had repeated vomiting and now bloody diarrhea, with abdominal pain and lethargy. An abdominal film shows radiopaque tablets.`,
    complaint: "Vomiting, bloody diarrhea, and abdominal pain after iron ingestion",
    blindComplaint: "Vomiting, bloody diarrhea, and abdominal pain with radiopaque tablets on X-ray",
    vitals: { hr: [110, 135], sbp: [85, 105], rr: [22, 30], temp: [37.0, 37.8], spo2: [96, 100] },
    labs: [
      { k: "Serum iron", low: 400, high: 900, unit: "mcg/dL", abnHigh: 150, confirmatory: true },
      { k: "Anion gap", low: 16, high: 24, unit: "", abnHigh: 12 },
      { k: "Venous pH", low: 7.20, high: 7.32, unit: "", dp: 2, abnLow: 7.35 },
      { k: "Glucose", low: 150, high: 220, unit: "mg/dL", abnHigh: 140 },
    ],
    findings: ["Stage 1: GI hemorrhage (vomiting, bloody diarrhea)", "Radiopaque pills on abdominal X-ray", "Anion-gap metabolic acidosis; risk of later hepatotoxicity and shock"],
    toxidrome: "Corrosive GI injury + metabolic acidosis / shock",
    diagnosis: "Iron poisoning — a serum iron >500 mcg/dL or systemic toxicity marks a serious ingestion with a characteristic multi-stage course.",
    workup: [
      "Serum iron level (peak 4–6 h; enteric-coated later), anion gap, glucose, LFTs",
      "Abdominal X-ray for radiopaque tablets; whole-bowel irrigation if seen",
      "Type and screen (GI bleeding)",
    ],
    pharm: {
      antidote: "Deferoxamine",
      mechanism: "Chelates free iron to form ferrioxamine, which is renally excreted (classically turns urine 'vin rosé').",
      dosing: () => [
        { drug: "Deferoxamine", dose: "15 mg/kg/h IV infusion for serious toxicity (shock, acidosis, iron >500); titrate, watch for hypotension" },
        { drug: "Whole-bowel irrigation", dose: "Polyethylene glycol 1–2 L/h until rectal effluent is clear and tablets have passed" },
      ],
      supportive: ["Aggressive IV fluid resuscitation for GI losses and shock", "Correct coagulopathy; monitor LFTs for stage-3 hepatotoxicity", "Activated charcoal does NOT bind iron — don't rely on it"],
      pitfalls: "A quiet 'stage 2' can lull you before shock and acidosis hit. Charcoal is ineffective for iron; use whole-bowel irrigation and deferoxamine.",
    },
  },
];

// ---- Patient generation ----------------------------------------------------
function buildPatient() {
  const female = Math.random() < 0.5;
  const age = rint(17, 74);
  const name = (female ? pick(FIRST_NAMES_F) : pick(FIRST_NAMES_M)) + " " + pick(["A.", "B.", "C.", "D.", "K.", "M.", "R.", "S.", "T."]);
  const weightKg = round(rnd(52, 96), 1);
  return {
    name,
    age,
    female,
    weightKg,
    pronounSubject: female ? "she" : "he",
    pronounSubjectCap: female ? "She" : "He",
    pronounObject: female ? "her" : "him",
    hoursAgo: rint(2, 10),
    glucose: rint(30, 52),
  };
}

function sampleVitals(spec) {
  return {
    HR: `${rint(spec.hr[0], spec.hr[1])} bpm`,
    BP: `${rint(spec.sbp[0], spec.sbp[1])}/${rint(spec.sbp[0] - 40, spec.sbp[1] - 40)} mmHg`,
    RR: `${rint(spec.rr[0], spec.rr[1])} /min`,
    Temp: `${round(rnd(spec.temp[0], spec.temp[1]), 1)} °C`,
    SpO2: `${rint(spec.spo2[0], spec.spo2[1])} %`,
  };
}

function sampleLabs(specs) {
  return specs.map((l) => {
    const dp = l.dp ?? 0;
    const val = round(rnd(l.low, l.high), dp);
    let abnormal = false;
    if (l.abnHigh != null && val > l.abnHigh) abnormal = true;
    if (l.abnLow != null && val < l.abnLow) abnormal = true;
    return { k: l.k, v: `${val}${l.unit ? " " + l.unit : ""}`, abnormal, confirmatory: !!l.confirmatory };
  });
}

// ---- Rendering -------------------------------------------------------------
function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

function statHtml(l) {
  return `<div class="stat${l.abnormal ? " abn" : ""}"><div class="k">${esc(l.k)}</div><div class="v">${esc(l.v)}</div></div>`;
}

function renderCase(toxin, patient, mode) {
  const blind = mode === "unknown";
  const agent = pick(toxin.agents);
  const agentAmount = pick(["a handful", "roughly 20 tablets", "an unknown quantity", "most of a bottle", "about 30 tablets", "a large ingestion"]);
  const p = { ...patient, agent, agentAmount };

  const vitals = sampleVitals(toxin.vitals);
  const allLabs = sampleLabs(toxin.labs);
  // In empiric mode, hide the drug-identifying confirmatory labs from the case.
  const caseLabs = blind ? allLabs.filter((l) => !l.confirmatory) : allLabs;
  const confirmLabs = blind ? allLabs.filter((l) => l.confirmatory) : [];

  const rxList = toxin.pharm.dosing(p);

  const story = blind ? toxin.blindStory(p) : toxin.story(p);
  const complaint = blind ? toxin.blindComplaint : toxin.complaint;

  const vitalsHtml = Object.entries(vitals).map(([k, v]) =>
    `<div class="stat"><div class="k">${esc(k)}</div><div class="v">${esc(v)}</div></div>`).join("");
  const labsHtml = caseLabs.map(statHtml).join("");
  const findingsHtml = toxin.findings.map((f) => `<li>${esc(f)}</li>`).join("");
  const workupHtml = toxin.workup.map((w) => `<li>${esc(w)}</li>`).join("");
  const rxHtml = rxList.map((r) =>
    `<div class="rx"><span class="drug">${esc(r.drug)}:</span> <span class="dose">${esc(r.dose)}</span></div>`).join("");
  const supportiveHtml = toxin.pharm.supportive.map((s) => `<li>${esc(s)}</li>`).join("");

  const confirmHtml = confirmLabs.length
    ? `<p><strong>Confirmatory studies (resulted later — you should have treated before these returned):</strong></p>
       <div class="labs-grid">${confirmLabs.map(statHtml).join("")}</div>`
    : "";

  const labsNote = blind
    ? `<span class="pill" style="margin-left:auto">confirmatory levels pending</span>`
    : `<span class="pill" style="margin-left:auto">abnormal in red</span>`;

  const diffLabel = { 1: "Core", 2: "Intermediate", 3: "Advanced" }[toxin.difficulty];
  const modeLabel = blind ? "Unknown ingestion (empiric)" : "Known ingestion";

  return `
    <article class="card">
      <p class="pill">Presentation</p>
      <h2 class="case-title">${esc(p.name)} — ${p.age} y/o ${p.female ? "female" : "male"}, ${p.weightKg} kg</h2>
      <div class="case-meta">
        <span class="pill">${esc(modeLabel)}</span>
        <span class="pill">${esc(diffLabel)}</span>
      </div>
      <p style="margin-top:0.8rem">${esc(story)}</p>
      <p><strong>Chief concern:</strong> ${esc(complaint)}</p>
    </article>

    <article class="card">
      <h2><span class="num">1</span> Vital signs</h2>
      <div class="vitals-grid">${vitalsHtml}</div>
    </article>

    <article class="card">
      <h2><span class="num">2</span> Focused exam findings</h2>
      <ul class="tight">${findingsHtml}</ul>
    </article>

    <article class="card">
      <h2><span class="num">3</span> Labs &amp; studies ${labsNote}</h2>
      <div class="labs-grid">${labsHtml}</div>
    </article>

    <article class="card">
      <h2><span class="num">4</span> Student prompts</h2>
      <ul class="tight">
        <li>What toxidrome do these vitals, exam, and labs fit?</li>
        <li><strong>Identify the most likely toxin (or toxin class) — commit to a specific answer.</strong></li>
        <li>What empiric treatment would you start <em>now</em>, before any confirmatory level returns?</li>
        <li>What confirmatory studies would you send, and what supportive care and monitoring does this patient need?</li>
      </ul>
    </article>

    <details class="card answer">
      <summary>Reveal answer &amp; pharmacotherapy plan</summary>
      <div>
        <p><strong>Most likely toxin:</strong> ${esc(toxin.name)}</p>
        <p><strong>Category:</strong> ${esc(toxin.category)}</p>
        <p><strong>Toxidrome:</strong> ${esc(toxin.toxidrome)}</p>
        <p><strong>Diagnosis:</strong> ${esc(toxin.diagnosis)}</p>
        ${confirmHtml}
        <p><strong>Targeted workup:</strong></p>
        <ul class="tight">${workupHtml}</ul>

        <h2 style="margin-top:1rem"><span class="num">Rx</span> Empiric pharmacotherapy — ${esc(toxin.pharm.antidote)}</h2>
        <p><em>${esc(toxin.pharm.mechanism)}</em></p>
        ${rxHtml}
        <p><strong>Supportive care:</strong></p>
        <ul class="tight">${supportiveHtml}</ul>
        <p style="margin-top:0.6rem"><strong>Key pitfall:</strong> ${esc(toxin.pharm.pitfalls)}</p>
      </div>
    </details>
  `;
}

// ---- Controller ------------------------------------------------------------
function init() {
  const categorySel = document.getElementById("category");
  const modeSel = document.getElementById("mode");
  const difficultySel = document.getElementById("difficulty");
  const generateBtn = document.getElementById("generate");
  const printBtn = document.getElementById("print");
  const caseArea = document.getElementById("case-area");
  const emptyState = document.getElementById("empty-state");

  // Populate category filter
  const categories = [...new Set(TOXINS.map((t) => t.category))].sort();
  for (const c of categories) {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    categorySel.appendChild(opt);
  }

  function generate() {
    let pool = TOXINS.slice();
    if (categorySel.value !== "all") pool = pool.filter((t) => t.category === categorySel.value);
    if (difficultySel.value !== "all") pool = pool.filter((t) => t.difficulty === Number(difficultySel.value));
    if (pool.length === 0) {
      caseArea.hidden = true;
      emptyState.hidden = false;
      emptyState.innerHTML = "<p>No cases match that combination. Try widening the filters.</p>";
      return;
    }
    const toxin = pick(pool);
    const patient = buildPatient();
    caseArea.innerHTML = renderCase(toxin, patient, modeSel.value);
    caseArea.hidden = false;
    emptyState.hidden = true;
    window.scrollTo({ top: caseArea.offsetTop - 20, behavior: "smooth" });
  }

  generateBtn.addEventListener("click", generate);
  printBtn.addEventListener("click", () => window.print());
}

document.addEventListener("DOMContentLoaded", init);
