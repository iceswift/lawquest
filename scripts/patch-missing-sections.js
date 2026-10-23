const fs = require('fs');
const path = require('path');

const targetFile = path.resolve(__dirname, '../data/legal-v2/texts/thai-civil-procedure-code/en/en-ai-draft-2026-06-05.json');
const data = JSON.parse(fs.readFileSync(targetFile, 'utf8'));

// 1. Filter out the duplicate section-199-sex if it is at the end or anywhere
const initialLength = data.sections.length;
data.sections = data.sections.filter(s => s.sectionId !== 'thai-civil-procedure-code-section-199-sex');
console.log(`Removed duplicate 199-sex. Length went from ${initialLength} to ${data.sections.length}.`);

// 2. Define the missing translations
const missingTranslations = {
  'thai-civil-procedure-code-section-106-1': {
    text: "It is prohibited to issue a summons for the following witnesses:\n\n(1) The King, the Queen, the Heir to the Throne, or the Regent, under any circumstances;\n\n(2) Buddhist monks and novices, under any circumstances;\n\n(3) Persons who receive privileges or immunity under the law.\n\nIn the cases under (2) and (3), the Court, the commissioned judge, or the appointed Court shall issue a notice stating the place, date, and time of the witness examination instead of issuing a summons. In the case under (2), the notice shall be sent to the witness, and in the case under (3), the notice shall be sent to the Office of the Judiciary to proceed in accordance with the provisions governing the matter or in accordance with the principles of international law.",
    translationStatus: "draft",
    reviewStatus: "needs_legal_review",
    needsReview: false,
    reviewNotes: []
  },
  'thai-civil-procedure-code-section-127-bis': {
    text: "An original of documentary evidence or material evidence of importance which has been submitted to the Court by a party or a third person, if the person who submitted it needs to use it regularly or out of necessity, or if it is important for safekeeping, the Court may permit the person who submitted it to retrieve it, by allowing the parties to inspect it and requiring the person who submitted it to submit a copy or photograph in its place, or the Court may issue any order as it deems appropriate.",
    translationStatus: "draft",
    reviewStatus: "needs_legal_review",
    needsReview: false,
    reviewNotes: []
  },
  'thai-civil-procedure-code-section-128-1': {
    text: "In the case where it is necessary to use scientific evidence to prove any fact that is an important issue in the case, when the Court deems appropriate or at the request of any party, the Court has the power to order a test to prove any person, object, or document by scientific methods.\n\nIn the case where scientific evidence is capable of proving the facts that enable the Court to adjudicate the case without the need to examine other evidence, when the Court deems appropriate or at the request of any party, the Court may order the test under paragraph one without waiting for the scheduled date of witness examination.\n\nIn the case where the test under paragraph one or paragraph two requires the collection of samples of blood, tissue, skin, hair, urine, feces, saliva or other secretions, genetic material, or other body parts, or substances inside the body from a party or any person, the Court may direct the party or person to undergo a test by a medical doctor or other expert, but it must be done only to the extent necessary and appropriate. In this regard, it shall be the right of such party or person to give consent or not.\n\nIn the case where any party fails to give consent or fails to cooperate with the test under paragraph one or paragraph second, or fails to give consent or acts to prevent a concerned person from giving consent to the collection of samples of body parts under paragraph three, it shall be presumed for the time being that the facts are as alleged by the opposing party.\n\nAll expenses for the test under this Section shall be borne by the party requesting the test, and shall be deemed as part of the court fees. However, if the requesting party is unable to pay the expenses, or in the case where the Court itself orders the test, the Court shall order payment in accordance with the regulations prescribed by the Judicial Administration Commission, and the liability for such expenses shall be in accordance with Section 158 or Section 161.",
    translationStatus: "draft",
    reviewStatus: "needs_legal_review",
    needsReview: false,
    reviewNotes: []
  },
  'thai-civil-procedure-code-section-153-1': {
    text: "The court fees under Section 149 and the fees for execution of judgment under Section 153 shall be paid in accordance with the methods and rates prescribed in this Code or in accordance with the methods and rates prescribed by other laws.",
    translationStatus: "draft",
    reviewStatus: "needs_legal_review",
    needsReview: false,
    reviewNotes: []
  },
  'thai-civil-procedure-code-section-199-hex': {
    text: "In the case where the plaintiff fails to submit an answer to the defendant's counterclaim within the specified period, the provisions of this Section 1 shall apply mutatis mutandis only in relation to such counterclaim.",
    translationStatus: "draft",
    reviewStatus: "needs_legal_review",
    needsReview: false,
    reviewNotes: []
  }
};

// 3. Patch the missing sections
let patchCount = 0;
data.sections.forEach(s => {
  if (missingTranslations[s.sectionId]) {
    const patch = missingTranslations[s.sectionId];
    s.text = patch.text;
    s.translationStatus = patch.translationStatus;
    s.reviewStatus = patch.reviewStatus;
    s.needsReview = patch.needsReview;
    s.reviewNotes = patch.reviewNotes;
    patchCount++;
  }
});

console.log(`Patched ${patchCount} sections.`);

fs.writeFileSync(targetFile, JSON.stringify(data, null, 2));
console.log('Saved successfully.');
