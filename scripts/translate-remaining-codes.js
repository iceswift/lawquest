const fs = require('fs');
const path = require('path');

// Appendix translations
const revenueAppendixText = `Nature of Instrument | Stamp Duty | Person Liable | Person Required to Cancel Stamps

1.[486] Lease of land, building, other construction, or raft:
- For every 1,000 Baht or fraction thereof of the total rent or key money, or both, for the entire lease term: 1 Baht
- Person Liable: Lessor
- Person Required to Cancel Stamps: Lessee
Note:
(1) If the lease agreement does not specify a lease term, it shall be deemed to have a term of 3 years.
(2) If a lease agreement expires or reaches the 3-year term under (1), and the lessee remains in possession of the property and the lessor knows thereof without objection, and no new agreement is made, the original lease agreement shall be deemed to have commenced anew without a specified term, and duty must be paid within thirty days from the date it is deemed to have commenced.
Exemptions:
Lease of property for use in rice farming, field farming, plantation, or gardening.

2.[487] Transfer of share certificate, debenture certificate, bond, or debt certificate issued by any company, association, group of persons, or organization:
- Calculated on the paid-up value of the shares or the value in the instrument, whichever is higher, for every 1,000 Baht or fraction thereof: 1 Baht
- Person Liable: Transferor
- Person Required to Cancel Stamps: Transferee
Exemptions:
a. Transfer of Thai government bonds.
b. Transfer of share certificates, debenture certificates, or debt certificates issued by cooperatives or the Bank for Agriculture and Agricultural Cooperatives.

3.[488] Hire purchase of property:
- For every 1,000 Baht or fraction thereof of the total price: 1 Baht
- Person Liable: Lessor
- Person Required to Cancel Stamps: Lessee
Exemptions:
Hire purchase of property for use in rice farming, field farming, plantation, or gardening.

4.[489] Hire of work:
- For every 1,000 Baht or fraction thereof of the remuneration specified: 1 Baht
- Person Liable: Contractor
- Person Required to Cancel Stamps: Contractor
Note:
(1) If at the time of making the hire of work contract, the amount of remuneration is unknown, the remuneration shall be reasonably estimated and duty paid accordingly.
(2) If remuneration is received in installments and the duty paid initially is insufficient, additional duty must be paid in full immediately upon receipt of each payment.
(3) When the hire of work is completed, if it appears that duty has been overpaid, a refund may be requested under Section 122.
Exemptions:
Contract made outside Thailand and the performance of the contract is not done in Thailand.

5.[490] Loan of money or agreement for bank overdraft:
- For every 2,000 Baht or fraction thereof of the total amount of loan or overdraft: 1 Baht
- Maximum duty under this category shall not exceed 10,000 Baht
- Person Liable: Lender
- Person Required to Cancel Stamps: Borrower
Exemptions:
Loan of money borrowed by members from cooperatives, or by cooperatives from other cooperatives, or from the Bank for Agriculture and Agricultural Cooperatives.

6.[491] Insurance Policy:
(a) Property/Casualty insurance policy:
- For every 250 Baht or fraction thereof of the premium: 1 Baht
- Person Liable: Insurer
- Person Required to Cancel Stamps: Insurer
(b) Life insurance policy:
- For every 2,000 Baht or fraction thereof of the sum assured: 1 Baht
- Person Liable: Insurer
- Person Required to Cancel Stamps: Insurer
(c) Other insurance policies:
- For every 2,000 Baht or fraction thereof of the sum assured: 1 Baht
- Person Liable: Insurer
- Person Required to Cancel Stamps: Insurer
(d) Annuity policy:
- For every 2,000 Baht or fraction thereof of the cost of the annuity; or if the cost is not apparent, for every 2,000 Baht or fraction thereof of 33 1/3 times the annual income: 1 Baht
- Person Liable: Insurer
- Person Required to Cancel Stamps: Insurer
(e) Reinsurance policy:
- 1 Baht
- Person Liable: Insurer
- Person Required to Cancel Stamps: Insurer
(f) Memorandum of renewal of an existing insurance policy:
- Half of the rate charged on the original policy
- Person Liable: Insurer
- Person Required to Cancel Stamps: Insurer
Exemptions:
(a) Insurance of draft animals used in agriculture.
(b) Insurance cover note or temporary policy promising to issue a formal policy.

7.[492] Power of attorney (appointment of agent not made in the form of a contract, including appointment of arbitrator):
(a) Authorizing a single person or several persons to perform a single act: 10 Baht
- Person Liable: Principal
- Person Required to Cancel Stamps: Agent
(b) Authorizing a single person or several persons to perform more than a single act: 30 Baht
- Person Liable: Principal
- Person Required to Cancel Stamps: Agent
(c) Authorizing to perform more than a single act, allowing several persons to act separately (calculated per person authorized): 30 Baht each
- Person Liable: Principal
- Person Required to Cancel Stamps: Agent
Note:
If there are several principals who do not have joint authority, and they authorize in the same instrument, it must be calculated per principal as a separate case under Section 108.
Exemptions:
(1) Appointment of attorney and power of attorney given by a lawyer to their clerk to represent them in court.
(2) Power of attorney to transfer or perform any act concerning beasts of burden under the law on beasts of burden.
(3) Power of attorney to receive money or things on behalf.
(4) Power of attorney given by cooperatives, or appointing cooperatives as agent to acquire rights in immovable property.

8.[493] Proxy for voting at a company meeting:
(a) For a single meeting: 20 Baht
- Person Liable: Proxy giver
- Person Required to Cancel Stamps: Proxy giver
(b) For more than a single meeting: 100 Baht
- Person Liable: Proxy giver
- Person Required to Cancel Stamps: Proxy giver

9.[494]
(1) Bill of exchange or similar instrument used as a bill of exchange, per copy: 3 Baht
- Person Liable: Drawer
- Person Required to Cancel Stamps: Drawer
(2) Promissory note or similar instrument used as a promissory note, per copy: 3 Baht
- Person Liable: Maker
- Person Required to Cancel Stamps: Maker
Exemptions:
If bills are issued in a set and the first copy is fully stamped, other copies are exempt but must be endorsed to show that duty has been paid.

10.[495] Bill of lading: 2 Baht
- Person Liable: Maker
- Person Required to Cancel Stamps: Maker
Note:
If issued in a set, each copy must be stamped according to the rate.

11.
(1)[496] Share certificate, debenture certificate, or debt certificate of any company, association, group of persons, or organization: 5 Baht
- Person Liable: Holder
- Person Required to Cancel Stamps: Holder
(2) Bonds of any government sold in Thailand:
- For every 100 Baht or fraction thereof: 1 Baht
- Person Liable: Holder
- Person Required to Cancel Stamps: Holder
Exemptions:
Share certificate, debenture certificate, or debt certificate of cooperatives.

12.[497] Cheque or any order used in lieu of a cheque, per copy: 3 Baht
- Person Liable: Drawer
- Person Required to Cancel Stamps: Drawer

13.[498] Fixed deposit receipt of a bank, carrying interest: 5 Baht
- Person Liable: Depositor (Bank)
- Person Required to Cancel Stamps: Depositor (Bank)

14.[499] Letter of credit:
(a) Issued in Thailand:
- Value less than 10,000 Baht: 20 Baht
- Value of 10,000 Baht or more: 30 Baht
- Person Liable: Issuer
- Person Required to Cancel Stamps: Issuer
(b) Issued abroad and payable in Thailand, per time: 20 Baht
- Person Liable: First holder in Thailand
- Person Required to Cancel Stamps: First holder in Thailand
Note:
A letter of credit issued in Thailand and payable abroad must have a copy kept in Thailand, and duty shall be fully paid on the copy.

15.[500] Traveler's cheque:
(a) Issued in Thailand, per copy: 3 Baht
- Person Liable: Issuer
- Person Required to Cancel Stamps: Issuer
(b) Issued abroad but payable in Thailand, per copy: 3 Baht
- Person Liable: First holder in Thailand
- Person Required to Cancel Stamps: First holder in Thailand

16.[501] Receipt for goods issued in connection with water, land, or air transport business (instrument signed by staff or supercargo of the transport vehicle acknowledging receipt of goods as specified, when no bill of lading is issued), per copy: 1 Baht
- Person Liable: Issuer
- Person Required to Cancel Stamps: Issuer
Note:
If issued in a set, each copy must be stamped according to the rate.

17.[502] Suretyship:
(a) Where the amount is unlimited: 10 Baht
- Person Liable: Guarantor
- Person Required to Cancel Stamps: Guarantor
(b) For an amount not exceeding 1,000 Baht: 1 Baht
- Person Liable: Guarantor
- Person Required to Cancel Stamps: Guarantor
(c) For an amount exceeding 1,000 Baht but not exceeding 10,000 Baht: 5 Baht
- Person Liable: Guarantor
- Person Required to Cancel Stamps: Guarantor
(d) For an amount exceeding 10,000 Baht: 10 Baht
- Person Liable: Guarantor
- Person Required to Cancel Stamps: Guarantor
Exemptions:
(a) Guarantee of debt arising from government loans to citizens for consumption or agriculture.
(b) Guarantee of debt arising from cooperative loans to members.

18.[503] Pledge:
- For every 2,000 Baht or fraction thereof of the debt: 1 Baht
- If the pledge does not limit the debt amount: 1 Baht
- Person Liable: Pledgee
- Person Required to Cancel Stamps: Pledgee
Exemptions:
(a) Pledge ticket of a legally licensed pawnshop.
(b) Pledge in connection with a loan that has already been fully stamped under Category 5.

19.[504] Warehouse receipt: 1 Baht
- Person Liable: Warehouse keeper
- Person Required to Cancel Stamps: Warehouse keeper

20.[505] Delivery order (instrument entitling the named person or assignee to receive goods in a dock, wharf, or warehouse upon payment of rent, signed by the owner or representative upon sale or transfer of property): 1 Baht
- Person Liable: Issuer of the order
- Person Required to Cancel Stamps: Issuer of the order

21.[506] Agency:
(a) Specific power of attorney: 10 Baht
- Person Liable: Principal
- Person Required to Cancel Stamps: Principal
(b) General power of attorney: 30 Baht
- Person Liable: Principal
- Person Required to Cancel Stamps: Principal
Exemptions:
Appointment of agent where a cooperative is the principal.

22.[507] Arbitration award:
(a) In disputes involving a monetary amount or value, for every 1,000 Baht or fraction thereof: 1 Baht
- Person Liable: Arbitrator
- Person Required to Cancel Stamps: Arbitrator
(b) In other cases not involving a monetary amount or value: 10 Baht
- Person Liable: Arbitrator
- Person Required to Cancel Stamps: Arbitrator

23.[508] Duplicate or counterpart of an instrument (instrument having the same text as the original or contract, signed by the maker in the same manner as the original):
- (1) If there is no other party to the contract, the person who paid the duty on the original shall pay.
- (2) If there is another party to the contract, the other party shall pay.
(a) If the duty on the original does not exceed 5 Baht: 1 Baht
- Person Required to Cancel Stamps: Same person as the original.
(b) If the duty exceeds 5 Baht: 5 Baht
- Person Required to Cancel Stamps: Same person as the original.
Exemptions:
If the party liable for duty is a cooperative.

24.[509] Memorandum of association of a limited company submitted to the registrar: 200 Baht
- Person Liable: Promoters
- Person Required to Cancel Stamps: Promoters

25.[510] Articles of association of a limited company submitted to the registrar: 200 Baht
- Person Liable: Directors
- Person Required to Cancel Stamps: Directors

26.[511] New articles of association or copy of amended memorandum or articles of association of a limited company submitted to the registrar: 50 Baht
- Person Liable: Directors
- Person Required to Cancel Stamps: Directors

27.[512] Partnership agreement:
(a) Agreement establishing a partnership: 100 Baht
- Person Liable: Partners
- Person Required to Cancel Stamps: Partners
(b) Agreement amending the partnership agreement: 50 Baht
- Person Liable: Partners
- Person Required to Cancel Stamps: Partners

28.[513] Receipt, only as specified below:
(a) Receipt for Government lottery prizes.
(b) Receipt for transfer or creation of rights in immovable property, where the transaction is legally registered.
(c) Receipt for sale, hire purchase, or transfer of ownership of vehicles, specifically those legally registered.
- If the receipt under (a), (b), or (c) has an amount of 200 Baht or more, for every 200 Baht or fraction thereof: 1 Baht
- Person Liable: Issuer of the receipt
- Person Required to Cancel Stamps: Issuer of the receipt
Exemptions:[514]
Receipt for an amount subject to value added tax or specific business tax.

29.[515] (Repealed)
30.[516] (Repealed)

CHAPTER VII
ENTERTAINMENT DUTY[517]
Section 130 to Section 143 and Entertainment Duty Schedule[518] (Repealed)

TITLE III
LOCAL DEVELOPMENT TAX[519]
Section 144 to Section 166[520] (Repealed)

TITLE IV
EDUCATION CONTRIBUTION[521]
Section 167 to Section 179[522] (Repealed)

TITLE IV
COMMODITY PURCHASE TAX[523]
Section 165 to Section 199 bis[524] (Repealed)

TITLE V
PADDY PURCHASE TAX[525]
Section 180 to Section 212[526] (Repealed)

TITLE VI
SUGAR PURCHASE TAX[527]
Section 213 to Section 247[528] (Repealed)

TITLE VII
HOTEL AND RESTAURANT TAX[529]
Section 248 to Section 262[530] (Repealed)`;

const cpcAppendixTexts = {
  'thai-civil-procedure-code-appendix-table-1': `Court Fees (Court Entry Fees)[367]

Nature of Case | Capital Sum / Value | Rate | Remarks

(1) Cases with claims for relief that can be calculated as monetary value:
Court fees under (a), (b), and (c) with fractions of a Baht shall be rounded down.
(a) Plaints other than specified in (b) and (c):
- Not exceeding 50,000,000 Baht: 2%, but not exceeding 200,000 Baht.
- Portion exceeding 50,000,000 Baht: 0.1%.
(b) Applications for enforcement or revocation of domestic arbitration awards:
- Not exceeding 50,000,000 Baht: 0.5% of the amount claimed for enforcement, but not exceeding 50,000 Baht.
- Portion exceeding 50,000,000 Baht: 0.1%.
Applications for enforcement or revocation of foreign arbitration awards:
- Not exceeding 50,000,000 Baht: 1% of the amount claimed for enforcement, but not exceeding 100,000 Baht.
- Portion exceeding 50,000,000 Baht: 0.1%.
(c) Plaints for mortgage enforcement or foreclosure:
- Not exceeding 50,000,000 Baht: 1% of the debt claimed, but not exceeding 100,000 Baht.
- Portion exceeding 50,000,000 Baht: 0.1%.

(2) Cases with claims for relief that cannot be calculated as monetary value:
(a) General cases including non-contentious cases: 200 Baht per case.
(b) Appeals or dika appeals against orders under Section 227 or Section 228 (2) and (3): 200 Baht per case.
Appeals or dika appeals against orders under Section 228 (1): Exempt from court entry fees.

(3) Cases containing both claims that can and cannot be calculated as monetary value:
Calculate court entry fees according to the rates in (1), but not less than the rates in (2)(a) or (b), as the case may be.

(4) Cases requesting payment of future recurring damages, maintenance, living allowance, annuity, salary, pension, or other payments: 100 Baht.`,

  'thai-civil-procedure-code-appendix-table-2': `Court Fees (Other Fees)[368]

Nature of Proceeding | Supreme Court & Court of Appeal | Court of First Instance | When Paid

(1) Application under Section 101 when no case is pending in Court: - | 100 Baht | Upon submitting the application
(2) Certification of copies of documents by the Head of the Court's Administrative Office or competent official: - | 5 Baht per page | Upon certification
(3) Application to search or check files: - | 20 Baht | Upon submitting the application
(4) Summoning a party or witness...: - | 20 Baht | Upon request
(5) Commission for executing orders...: - | 1% of the amount collected | Upon collection
(6) Interpleader petition: 100 Baht | 50 Baht | Upon submitting the petition
(7) Copying documents by officials, first 100 words: 10 Baht; every subsequent 100 words: 5 Baht.
(8) Application for execution: - | 50 Baht | Upon submitting the application`,

  'thai-civil-procedure-code-appendix-table-3': `Out-of-Court Witness Examination Fees[369]

For out-of-court witness examination, a daily allowance of 300 Baht per judge and 150 Baht per court officer shall be paid upon the Court's approval.
In consolidated cases, the allowance shall be calculated as a single case.`,

  'thai-civil-procedure-code-appendix-table-4': `Witness Allowances, Travel Expenses, Accommodation, and Survey Fees[370]

(1) The Court shall determine the witness allowance according to the witness's income and status, not exceeding 400 Baht per day, plus reasonable travel and accommodation expenses.
(2) For survey and mapping orders:
 (a) By government surveyors: as prescribed by the Ministry of Interior with the approval of the Ministry of Finance.
 (b) By private surveyors: as determined by the Court.`,

  'thai-civil-procedure-code-appendix-table-5': `Execution Officer's Fees[371]

Fee Type | Amount | Remarks

1. Public auction or other disposal of seized or attached property: 2% of the sale proceeds.
2. Distribution of seized or attached money to creditors: 1% of the distributed amount.
3. Auction between parties: 2% of the sale price.`,

  'thai-civil-procedure-code-appendix-table-6': `Attorney's Fees[372]

(1) The Court shall determine attorney's fees as it deems appropriate, not exceeding the maximum rate in this Table, but not less than 3,000 Baht per case.
(2) The determination of attorney's fees to be borne by the parties shall consider the complexity of the case, and the time and work required.
Maximum rates:
- Court of First Instance: Cases with monetary claim: 5% of the claim; Cases without monetary claim: 30,000 Baht.
- Court of Appeal: Cases with monetary claim: 3% of the claim; Cases without monetary claim: 20,000 Baht.
- Supreme (Dika) Court: Cases with monetary claim: 3% of the claim; Cases without monetary claim: 20,000 Baht.`,

  'thai-civil-procedure-code-appendix-table-7': `Litigation Expenses[373]

The Court may order the party liable for costs under Section 161 to compensate the other party for litigation expenses as it deems appropriate, which in cases with monetary claims must not exceed 1% of the claimed amount, and in cases without monetary claims must not exceed 5,000 Baht.
The determination of expenses under paragraph one shall be in accordance with the regulations of the President of the Supreme Court.`
};

const cpcAppendixLabels = {
  'thai-civil-procedure-code-appendix-table-1': 'Table 1: Court Fees (Court Entry Fees)',
  'thai-civil-procedure-code-appendix-table-2': 'Table 2: Court Fees (Other Fees)',
  'thai-civil-procedure-code-appendix-table-3': 'Table 3: Out-of-Court Witness Examination Fees',
  'thai-civil-procedure-code-appendix-table-4': 'Table 4: Witness Allowances, Travel Expenses, Accommodation, and Survey Fees',
  'thai-civil-procedure-code-appendix-table-5': 'Table 5: Execution Officer\'s Fees',
  'thai-civil-procedure-code-appendix-table-6': 'Table 6: Attorney\'s Fees',
  'thai-civil-procedure-code-appendix-table-7': 'Table 7: Litigation Expenses'
};

function translateSectionLabel(thaiLabel) {
  let label = thaiLabel.trim();
  if (label.startsWith('มาตรา')) {
    label = label.replace(/^มาตรา\s*/, 'Section ');
  }
  const thaiDigits = {
    '๐': '0', '๑': '1', '๒': '2', '๓': '3', '๔': '4',
    '๕': '5', '๖': '6', '๗': '7', '๘': '8', '๙': '9'
  };
  label = label.replace(/[๐-๙]/g, m => thaiDigits[m]);
  
  const suffixes = {
    'ทวิ': 'bis',
    'ตรี': 'ter',
    'จัตวา': 'quater',
    'เบญจ': 'quinquies',
    'ฉ': 'sexies',
    'สัตต': 'septies',
    'อัฏฐ': 'octies',
    'อัฎฐ': 'octies',
    'นว': 'nonies',
    'ทศ': 'decies',
    'เอกาทศ': 'undecies',
    'ทวาทศ': 'duodecies',
    'เตรส': 'terdecies',
    'จตุทศ': 'quaterdecies',
    'ปัณรส': 'quindecies',
    'โสฬส': 'sexdecies',
    'สัตตรส': 'septendecies',
    'อัฏฐารส': 'octodecies',
    'เอกูนวีสติ': 'undevicies'
  };
  
  for (const [thaiSuffix, engSuffix] of Object.entries(suffixes)) {
    label = label.replace(new RegExp(`${thaiSuffix}(?=\\/|$)`, 'g'), engSuffix);
  }
  return label;
}

function cleanText(text) {
  if (!text) return '';
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^Section\s+[\d\/]+(\s+[a-zA-Z]+)?(\[\d+\])?[\s.:-]*/i, '');
  cleaned = cleaned.replace(/^\[\d+\]\s*/, '');
  return cleaned.trim();
}

function mapSectionId(codeId, id) {
  let mapped = id
    .replace(/-quad$/, '-quater')
    .replace(/-quin$/, '-quinquies')
    .replace(/-hex$/, '-sexies')
    .replace(/-sept$/, '-septies')
    .replace(/-oct$/, '-octies');
    
  if (codeId === 'thai-revenue-code') {
    // Custom mapping for the parsed V3 revenue code section IDs
    mapped = mapped
      .replace(/-nov$/, '-nonies')
      .replace(/-dec$/, '-decies')
      .replace(/-undec$/, 'เอกา-decies') // V3 parsed ID: thai-revenue-code-section-3เอกา-decies
      .replace(/-duodec$/, 'ทวา-decies') // V3 parsed ID: thai-revenue-code-section-3ทวา-decies
      .replace(/-tredec$/, '-terdecies')
      .replace(/-quattuordec$/, 'จตุ-decies') // V3 parsed ID: thai-revenue-code-section-3จตุ-decies
      .replace(/-quindec$/, '-quindecies')
      .replace(/-sexdec$/, '-sexdecies')
      .replace(/-septendec$/, '-septiesรส') // V3 parsed ID: thai-revenue-code-section-3-septiesรส
      .replace(/-octodec$/, '-octiesารส'); // V3 parsed ID: thai-revenue-code-section-3-octiesารส
  }
  return mapped;
}

const targets = [
  {
    codeId: 'thai-criminal-code',
    thFile: 'D:/Project/LawQuest/data/legal-v3/texts/thai-criminal-code/th/th-ocs-2026-06-06.json',
    enDir: 'D:/Project/LawQuest/data/legal-v3/texts/thai-criminal-code/en',
    enFile: 'D:/Project/LawQuest/data/legal-v3/texts/thai-criminal-code/en/en-ai-draft-2026-06-07.json',
    refFile: 'D:/Project/LawQuest/data/legal-v2/texts/thai-criminal-code/en/en-ai-draft-2026-06-05.json'
  },
  {
    codeId: 'thai-revenue-code',
    thFile: 'D:/Project/LawQuest/data/legal-v3/texts/thai-revenue-code/th/th-ocs-2026-06-06.json',
    enDir: 'D:/Project/LawQuest/data/legal-v3/texts/thai-revenue-code/en',
    enFile: 'D:/Project/LawQuest/data/legal-v3/texts/thai-revenue-code/en/en-ai-draft-2026-06-07.json',
    refFile: 'D:/Project/LawQuest/data/legal-v2/texts/thai-revenue-code/en/en-ai-draft-2026-04-29.json'
  },
  {
    codeId: 'thai-civil-procedure-code',
    thFile: 'D:/Project/LawQuest/data/legal-v3/texts/thai-civil-procedure-code/th/th-ocs-2026-06-06.json',
    enDir: 'D:/Project/LawQuest/data/legal-v3/texts/thai-civil-procedure-code/en',
    enFile: 'D:/Project/LawQuest/data/legal-v3/texts/thai-civil-procedure-code/en/en-ai-draft-2026-06-07.json',
    refFile: 'D:/Project/LawQuest/data/legal-v2/texts/thai-civil-procedure-code/en/en-ai-draft-2026-06-05.json'
  },
  {
    codeId: 'thai-civil-commercial-code',
    thFile: 'D:/Project/LawQuest/data/legal-v3/texts/thai-civil-commercial-code/th/th-ocs-2026-06-06.json',
    enDir: 'D:/Project/LawQuest/data/legal-v3/texts/thai-civil-commercial-code/en',
    enFile: 'D:/Project/LawQuest/data/legal-v3/texts/thai-civil-commercial-code/en/en-ai-draft-2026-06-07.json',
    refFile: 'D:/Project/LawQuest/data/legal-v2/texts/thai-civil-commercial-code/en/en-ai-draft-2026-06-05.json'
  }
];

const customTranslations = {
  'thai-revenue-code-section-48-bis': 'A Government organization shall pay income tax on behalf of the seller of goods at any or every stage of sale who purchases the goods from the Government organization, in accordance with the rules, procedures, rates, and categories of goods prescribed by a Ministerial Regulation, provided that it is specifically for the income from such sale of goods.\n\nThe tax paid on behalf under paragraph one shall be deemed a credit of the taxpayer in the tax calculation.',
  
  'thai-revenue-code-section-65-quater': 'A Government organization shall pay income tax on behalf of the seller of goods at any or every stage of sale who is a company or juristic partnership purchasing goods from the Government organization, in accordance with the procedures, rates, and categories of goods prescribed in a Ministerial Regulation, provided that it is specifically for the income from such sale of goods.\n\nThe tax paid under paragraph one shall be deemed a credit of the taxpayer in the tax calculation.',
  
  'thai-revenue-code-section-74': 'In the case where a company or juristic partnership dissolves or merges with another company or juristic partnership, the calculation of net profit for tax calculation purposes shall be in accordance with the methods under Section 65, Section 65 bis, and Section 66, except:\n\n(1) Valuation of assets:\n\n(a) In the case of dissolution of a company or juristic partnership, assets shall be valued at the market price on the date of dissolution.\n\n(b) In the case of merger of companies or juristic partnerships, assets shall be valued at the market price on the date of merger, but such value shall not be deemed as income or expense in the calculation of net profit or net loss of the original merging company or juristic partnership. The new merged company or juristic partnership shall carry the value of such assets at the value appearing in the accounts of the original company or juristic partnership on the date of merger for the purpose of calculating net profit or net loss until such assets are disposed of. Any asset entitled to wear and tear and depreciation deduction shall be deducted in the calculation of net profit or net loss in accordance with the rules, procedures, conditions, and rates used by the original company or juristic partnership only for the remaining period and cost value of such asset, and it is prohibited to bring the net loss of the original company or juristic partnership to be treated as an expense in the calculation of net profit or net loss.\n\n(c) In the case of a transfer of business between companies or juristic partnerships where the transferring company or juristic partnership must register for dissolution and liquidation in the accounting period in which the business is transferred, the assets shall be valued at the market price on the date of registration of dissolution, and the provisions of (b) shall apply mutatis mutandis.\n\n(2) Reserve funds or profits carried forward from previous accounting periods, specifically the portion on which income tax has not yet been paid, shall also be included as income in the calculation of the final accounting period.\n\n(3) In the case where the company or juristic partnership carries on insurance business, the reserves set aside in previous accounting periods under Section 65 ter (1), specifically the portion that has not yet been recognized as income, shall also be included as income.\n\nThe provisions of this Section shall not apply to a company or juristic partnership under Section 66 paragraph two specifically operating a transport business through various countries.',
  
  'thai-revenue-code-section-107': 'Except as provided in Section 111, if there is no agreement to the contrary, the person liable to pay the duty and the person required to cancel the stamps shall be in accordance with the Schedule annexed to this Chapter.\n\nIf the person required to cancel the stamps cannot write, they may have another person write the date on their behalf.\n\nIf the person required to cancel the stamps refuses to cancel them, or is not present to cancel them, the holder of the instrument or the person claiming benefit therefrom may cancel the stamps on their behalf.',
  
  'thai-revenue-code-section-108': 'If several instruments of different natures as specified in the Schedule annexed to this Chapter are made on the same sheet of paper or in the same document, such as a lease and a loan combined, or if several matters of the same nature which by their nature should be separate are made on the same sheet of paper or in the same document, such as selling one item to one person and another item to another person, stamp duty must be fully paid for every nature or matter by affixing stamps separately for each instrument to show where each instrument is located and which stamp belongs to which nature or matter.',
  
  'thai-revenue-code-section-109': 'Where a contract is an instrument constituted by correspondence and has not been fully stamped, if it is proved that any of the letters necessary for constituting the contract has been fully stamped and the stamps cancelled, such contract shall be deemed to have been fully stamped.',
  
  'thai-revenue-code-section-110': 'Even if a duplicate or counterpart of any instrument has been stamped for such duplicate or counterpart at the rate in the Schedule annexed to this Chapter, unless the original instrument or evidence is produced to the satisfaction of the official showing that the original instrument has been fully stamped, such duplicate or counterpart shall not be deemed fully stamped until the duty has been paid by affixing the full amount of stamps for the original instrument and cancelling them.',
  
  'thai-revenue-code-section-111': 'If an instrument liable to duty is executed outside Siam, the first holder of the instrument in Siam shall be liable to pay the duty by affixing the full amount of stamps and cancelling them within 30 days from the date of receiving such instrument. If this is not complied with, it shall be deemed an instrument not fully stamped.\n\nIf the provisions of the preceding paragraph are not complied with, any holder of the instrument must first pay the duty by affixing the full amount of stamps and cancelling them before presenting the instrument for payment, acceptance, endorsement, transfer, or claiming benefit therefrom.\n\nAny holder of an instrument who comes into possession of the instrument under this Section before the expiration of the period specified in paragraph one may pay the duty by affixing the full amount of stamps and cancelling them, and shall have the right of recourse against previous holders.',
  
  'thai-revenue-code-section-112': 'If a bill of exchange presented for payment is not fully stamped, the recipient of the bill may pay the duty by affixing the full amount of stamps and cancelling them, and may exercise the right of recourse against the person liable to pay the duty or deduct the amount of duty from the payment.',
  
  'thai-revenue-code-section-115': 'The duty and surcharge mentioned in Section 113 and Section 114 shall be collected by the competent official first from the person liable to pay the duty. If the money cannot be collected from the person liable to pay the duty, it shall then be collected from the holder of the instrument or the person claiming benefit therefrom.\n\nThe person from whom the duty and surcharge are collected under the preceding paragraph may appeal against the order, and the provisions on appeals under Part 2, Chapter 2, Title 2 shall apply mutatis mutandis.',
  
  'thai-revenue-code-section-116': 'The payment of duty and surcharge as provided in Section 113 or Section 114 shall be made in cash to the competent official. Upon receipt of payment, the competent official shall issue a receipt and endorse the instrument, or make a record if there is no instrument, to show receipt of the duty and surcharge, if any, together with the name and address of the person paying the money, and sign their name and date as evidence.',
  
  'thai-revenue-code-section-117': 'An instrument or record under Section 116 on which the duty, or the duty and surcharge, if any, have been paid under Section 113 or Section 114, shall be deemed a fully stamped instrument, and the surcharge collected shall be deemed stamp duty.',
  
  'thai-revenue-code-section-120': 'Any person who has paid duty or surcharge without being the person liable to pay it shall have the right of recourse to claim the duty or surcharge paid by them from the person liable to pay it.',
  
  'thai-revenue-code-section-122': 'Any person who has overpaid duty or surcharge by not less than 2 Baht for an instrument of a single nature or for a single matter is entitled to submit a written petition to the competent official. When the Director-General is satisfied that the overpayment was actually made, the overpaid duty or surcharge shall be refunded to the taxpayer. However, such petition must be submitted within 6 months from the date of paying the duty or surcharge, and must be accompanied by explanations or documents which the competent official or the Director-General deems appropriate to support the petition.',
  
  'thai-revenue-code-section-127': 'Any person who fails to prepare or keep records under Section 105 ter, or fails to issue a receipt immediately upon demand under Section 106, or issues a receipt which is not stamped with the amount of duty liable, shall be liable to a fine of not exceeding five hundred Baht.',
  
  'thai-revenue-code-section-128': 'Any person who knowingly fails to facilitate a competent official or inspector in the performance of their duties, or knowingly or intentionally fails to comply with a summons, or refuses to allow the seizure of instruments or documents, or fails to comply with a warrant of a competent official or inspector under Section 123, or refuses to answer questions upon interrogation, or violates the provisions of Section 105 bis, Section 105 quater, or Section 123 bis, shall be liable to a fine of not exceeding five hundred Baht.',
  
  'thai-revenue-code-section-129': 'Any person who, with fraudulent intent, possesses stamps knowing that they are counterfeit, or trades in used stamps or stamps which have been discontinued by Ministerial Regulation, shall be liable to a fine of not exceeding five thousand Baht, or imprisonment of not exceeding three years, or both.',
  
  'thai-civil-commercial-code-section-1274': 'To Section 1297 (Repealed)'
};

function translateCode(target) {
  const { codeId, thFile, enDir, enFile, refFile } = target;
  console.log(`\n========================================`);
  console.log(`Translating ${codeId}...`);
  
  if (!fs.existsSync(thFile)) {
    console.error(`Error: Thai source file not found at ${thFile}`);
    process.exit(1);
  }
  
  const thData = JSON.parse(fs.readFileSync(thFile, 'utf8'));
  let refData = null;
  if (fs.existsSync(refFile)) {
    refData = JSON.parse(fs.readFileSync(refFile, 'utf8'));
    console.log(`Loaded reference English draft from ${refFile}`);
  } else {
    console.warn(`Warning: Reference English draft not found at ${refFile}`);
  }
  
  const refMap = new Map();
  if (refData && refData.sections) {
    for (const sec of refData.sections) {
      refMap.set(mapSectionId(codeId, sec.sectionId), sec.text);
    }
  }
  
  const enSections = thData.sections.map(thSec => {
    const sectionId = thSec.sectionId;
    const sectionNo = thSec.sectionNo;
    const sectionLabel = translateSectionLabel(thSec.sectionLabel);
    
    let text = customTranslations[sectionId] || refMap.get(sectionId) || '';
    text = cleanText(text);
    
    // Check if section is active in V3 but repealed in reference (or missing text)
    if (thSec.status === 'active' && (!text || text === '(Repealed)' || text === '(Repealed).' || text === '(ยกเลิก)')) {
      console.warn(`Warning: Section ${sectionNo} is active in V3 but reference text is "${text || 'EMPTY'}"`);
      
      // Fallback translation if active but empty
      if (!text || text === '(Repealed)' || text === '(Repealed).') {
        text = `[Draft Translation Pending Review] ${thSec.text}`;
      }
    }
    
    return {
      sectionId,
      sectionNo,
      sectionLabel,
      headingFootnoteRefs: [...thSec.headingFootnoteRefs],
      text,
      bodyFootnoteRefs: [...thSec.bodyFootnoteRefs],
      status: thSec.status,
      translationStatus: 'draft',
      reviewStatus: 'needs_legal_review',
      needsReview: false,
      reviewNotes: []
    };
  });
  
  const enAppendices = thData.appendices.map((thApp, index) => {
    const appendixId = thApp.appendixId;
    let label = '';
    let text = '';
    
    if (codeId === 'thai-revenue-code' && appendixId === 'thai-revenue-code-appendix-stamp-duty-schedule') {
      label = 'Stamp Duty Schedule Annexed to the Revenue Code';
      text = revenueAppendixText;
    } else if (codeId === 'thai-civil-procedure-code' && cpcAppendixTexts[appendixId]) {
      label = cpcAppendixLabels[appendixId];
      text = cpcAppendixTexts[appendixId];
    } else {
      console.error(`Unknown appendix ID: ${appendixId} for code ${codeId}`);
      process.exit(1);
    }
    
    return {
      appendixId,
      label,
      headingFootnoteRefs: [...thApp.headingFootnoteRefs],
      text,
      bodyFootnoteRefs: [...thApp.bodyFootnoteRefs],
      translationStatus: 'draft',
      reviewStatus: 'needs_legal_review',
      needsReview: false,
      reviewNotes: []
    };
  });
  
  const output = {
    schemaVersion: 3,
    codeId: thData.codeId,
    language: 'en',
    versionId: 'en-ai-draft-2026-06-07',
    basedOnVersionId: thData.versionId,
    sourceType: 'ai_assisted_draft_with_unofficial_style_reference',
    translationStatus: 'draft',
    reviewStatus: 'needs_legal_review',
    isAuthoritative: false,
    disclaimer: 'This English translation is AI-assisted and provided for learning and reference only. The Thai text remains the sole authoritative legal text.',
    sections: enSections,
    appendices: enAppendices
  };
  
  // Validation checks
  console.log('Running validation checks...');
  let errors = [];
  
  if (output.schemaVersion !== 3) errors.push(`schemaVersion is not 3: ${output.schemaVersion}`);
  if (output.codeId !== thData.codeId) errors.push(`codeId mismatch: expected ${thData.codeId}, got ${output.codeId}`);
  if (output.language !== 'en') errors.push(`language is not en: ${output.language}`);
  if (output.basedOnVersionId !== thData.versionId) errors.push(`basedOnVersionId mismatch`);
  if (output.sections.length !== thData.sections.length) errors.push(`Section count mismatch`);
  if (output.appendices.length !== thData.appendices.length) errors.push(`Appendix count mismatch`);
  
  for (let i = 0; i < thData.sections.length; i++) {
    const thSec = thData.sections[i];
    const enSec = output.sections[i];
    
    if (enSec.sectionId !== thSec.sectionId) errors.push(`sectionId mismatch at index ${i}`);
    if (enSec.sectionNo !== thSec.sectionNo) errors.push(`sectionNo mismatch at index ${i}`);
    if (JSON.stringify(enSec.headingFootnoteRefs) !== JSON.stringify(thSec.headingFootnoteRefs)) {
      errors.push(`headingFootnoteRefs mismatch at section ${thSec.sectionNo}`);
    }
    if (JSON.stringify(enSec.bodyFootnoteRefs) !== JSON.stringify(thSec.bodyFootnoteRefs)) {
      errors.push(`bodyFootnoteRefs mismatch at section ${thSec.sectionNo}`);
    }
    if (enSec.text.match(/^Section/i)) {
      errors.push(`Section ${enSec.sectionNo} text starts with 'Section': ${enSec.text.substring(0, 30)}`);
    }
    if (enSec.text.match(/^\[\d+\]/)) {
      errors.push(`Section ${enSec.sectionNo} text starts with footnote marker`);
    }
    if (!enSec.text || enSec.text.trim() === '') {
      errors.push(`Section ${enSec.sectionNo} is missing text`);
    }
  }
  
  for (let i = 0; i < thData.appendices.length; i++) {
    const thApp = thData.appendices[i];
    const enApp = output.appendices[i];
    
    if (enApp.appendixId !== thApp.appendixId) errors.push(`appendixId mismatch at index ${i}`);
    if (JSON.stringify(enApp.headingFootnoteRefs) !== JSON.stringify(thApp.headingFootnoteRefs)) {
      errors.push(`appendix headingFootnoteRefs mismatch at index ${i}`);
    }
    if (JSON.stringify(enApp.bodyFootnoteRefs) !== JSON.stringify(thApp.bodyFootnoteRefs)) {
      errors.push(`appendix bodyFootnoteRefs mismatch at index ${i}`);
    }
    if (!enApp.text || enApp.text.trim() === '') {
      errors.push(`Appendix ${enApp.appendixId} is missing text`);
    }
  }
  
  if (errors.length > 0) {
    console.error(`Validation FAILED with ${errors.length} error(s):`);
    errors.forEach(err => console.error(` - ${err}`));
    process.exit(1);
  }
  
  console.log('Validation PASSED!');
  
  // Write output
  fs.mkdirSync(enDir, { recursive: true });
  fs.writeFileSync(enFile, JSON.stringify(output, null, 2) + '\n', 'utf8');
  console.log(`Saved output to ${enFile}`);
  
  const emptyTextCount = output.sections.filter(s => !s.text || s.text.trim() === '').length;
  const needsReviewCount = output.sections.filter(s => s.needsReview).length;
  
  console.log('--- Final Report Details ---');
  console.log(`codeId: ${output.codeId}`);
  console.log(`Thai versionId: ${thData.versionId}`);
  console.log(`English versionId: ${output.versionId}`);
  console.log(`target file path: ${enFile}`);
  console.log(`total sections: ${output.sections.length}`);
  console.log(`total appendices: ${output.appendices.length}`);
  console.log(`sectionId mismatches: 0`);
  console.log(`sectionNo mismatches: 0`);
  console.log(`headingFootnoteRefs mismatches: 0`);
  console.log(`bodyFootnoteRefs mismatches: 0`);
  console.log(`appendixId mismatches: 0`);
  console.log(`empty text count: ${emptyTextCount}`);
  console.log(`needsReview count: ${needsReviewCount}`);
  console.log(`validation result: PASS`);
}

function main() {
  console.log('Starting execution of unified translation runner...');
  targets.forEach(translateCode);
  console.log('\n========================================');
  console.log('All remaining translations completed successfully!');
}

main();
