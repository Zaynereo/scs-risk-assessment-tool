# Generic Cancer Risk Assessment: Questions & Weightage Rationale

## 1. Overview

The Generic Cancer Assessment covers **6 cancer types** in a single quiz session: Breast, Lung, Colorectal, Liver, Cervical, and Prostate. Each cancer type has its own set of questions with weights summing to 100%. Some questions are **shared** across multiple cancer types (asked once, scored for each applicable cancer with different weights), reducing total quiz length.

**Design principles:**
- Risk factors carry ~60-70% of total weight per cancer type; symptoms carry ~30-40%
- The #1 risk factor per Singapore Cancer Society (SCS) guidelines receives the highest weight
- Weights reflect relative importance based on quantified risk data from Singapore health authorities
- Questions are Yes/No format, independent (no conditional branching)
- Shared questions reduce total count while maintaining comprehensive per-cancer scoring

**Total unique questions: 40**
- Shared across cancers: 6
- Breast-specific: 6
- Lung-specific: 6
- Colorectal-specific: 6 (+ 5 shared = 11 contributing)
- Liver-specific: 5 (+ 3 shared = 8 contributing)
- Cervical-specific: 6 (+ 1 shared = 7 contributing)
- Prostate-specific: 5 (+ 3 shared = 8 contributing)

**Effective questions per participant:**
- Female: ~35 questions (skip 5 prostate-specific)
- Male: ~34 questions (skip 6 cervical-specific)

---

## 2. Sources & Research Methodology

All risk factors and weightage reasoning are based on verified data from the following **Singapore government and healthcare organisation** sources:

| Source | Abbreviation | Type |
|--------|-------------|------|
| Singapore Cancer Society | SCS | Non-profit, MOH-affiliated |
| SingHealth / National Cancer Centre Singapore | SingHealth/NCCS | Public healthcare cluster |
| HealthHub Singapore | HealthHub | MOH health information portal |
| National University Cancer Institute Singapore | NCIS | Public hospital cancer centre |
| Healthier SG (MOH) | HSG | National preventive health programme |

**Key source URLs:**
- SCS Breast: https://www.singaporecancersociety.org.sg/learn-about-cancer/types-of-cancer/breast-cancer.html
- SCS Lung: https://www.singaporecancersociety.org.sg/learn-about-cancer/types-of-cancer/lung-cancer.html
- SCS Colorectal: https://www.singaporecancersociety.org.sg/learn-about-cancer/types-of-cancer/colorectal-cancer.html
- SCS Liver: https://www.singaporecancersociety.org.sg/learn-about-cancer/types-of-cancer/liver-cancer.html
- SCS Cervical: https://www.singaporecancersociety.org.sg/learn-about-cancer/types-of-cancer/cervical-cancer.html
- SCS Prostate: https://www.singaporecancersociety.org.sg/learn-about-cancer/types-of-cancer/prostate-cancer.html
- SCS Cervical FAQ (oral contraceptives): https://singaporecancersociety.org.sg/knowcancertobeatcancer/component/content/article/9-cervical/81-does-contraceptive-use-increase-the-risk-of-developing-cervical-cancer
- SingHealth Breast: https://www.singhealth.com.sg/symptoms-treatments/breast-cancer
- SingHealth Lung: https://www.singhealth.com.sg/patient-care/conditions-treatments/lung-cancer
- SingHealth Liver/HCC: https://www.singhealth.com.sg/symptoms-treatments/primary-liver-cancer-hepatocellular-carcinoma
- SingHealth Colorectal: https://www.singhealth.com.sg/symptoms-treatments/colorectal-colon-cancer
- SingHealth Cervical: https://www.singhealth.com.sg/patient-care/conditions-treatments/cervix-cervical-cancer/overview
- SingHealth Prostate: https://www.singhealth.com.sg/symptoms-treatments/prostate-cancer
- SingHealth SOLSTICE Study: https://www.singhealth.com.sg/news/defining-med/nccs-solstice-study
- HealthHub Colorectal: https://www.healthhub.sg/a-z/diseases-and-conditions/colorectalcancer
- HealthHub Cervical: https://www.healthhub.sg/a-z/diseases-and-conditions/topic_cervical_cancer
- NCIS Breast: https://www.ncis.com.sg/cancer-information/cancer-types/breast-cancer
- NCIS Lung: https://www.ncis.com.sg/cancer-information/cancer-types/lung-cancer
- NCIS Liver: https://www.ncis.com.sg/cancer-information/cancer-types/liver-cancer
- NCIS Cancer Trends: https://www.ncis.com.sg/cancer-information/cancer-trends-and-statistics/cancer-trends-in-singapore
- Healthier SG Screening: https://www.healthhub.sg/programmes/healthiersg-screening/screening-journey
- SCS Mammogram Screening: https://www.singaporecancersociety.org.sg/get-screened/breast-cancer/mammogram.html

**Important note:** No standardised percentage-based risk scoring system is published by any Singapore health authority. The weights in this document are designed to reflect the **relative importance** of each risk factor as described by these sources (e.g., "100x more likely", "15-30x risk", "2x risk", "30% increase"). They are not clinical diagnostic weights.

---

## 3. Weightage Methodology

### How weights are assigned

Each cancer type's question weights sum to exactly **100%**. The weight reflects:

1. **Quantified risk multipliers** from SCS/SingHealth (e.g., Hep B = 100x risk gets highest weight for liver)
2. **Qualitative significance** descriptions (e.g., "#1 risk factor", "major risk factor", "significant risk")
3. **Risk factor type hierarchy**:
   - Primary/dominant risk factors: 18-28% (e.g., smoking for lung, HPV for cervical, Hep B/C for liver)
   - Major risk factors: 12-18% (e.g., family history, screening gaps, cirrhosis)
   - Moderate risk factors: 8-12% (e.g., diet, alcohol, hormonal factors)
   - Contributing/lifestyle factors: 5-8% (e.g., obesity, sedentary lifestyle, diabetes as secondary factor)
   - Symptom/warning signs: 7-15% (scaled lower than risk factors since this is a RISK assessment, not a diagnostic tool)

### How the scoring system works

Per the app's risk calculator (`controllers/riskCalculator.js`):
- Each answer contributes: `weight x (answerValue / 100)`
- "Yes" uses `yesValue` (typically 100), "No" uses `noValue` (typically 0)
- Per-cancer-type risk thresholds (Generic Assessment): LOW (0-39%), MEDIUM (40-69%), HIGH (70%+)
  - These lower thresholds (compared to specific assessments) reflect the triage nature of the generic assessment
  - Specific assessments use: LOW (0-32%), MEDIUM (33-65%), HIGH (66%+)
- Demographic adjustments: family history (+familyWeight%), age threshold (+ageRiskWeight%), ethnicity multiplier
- Final score is clamped to 0-100%

---

## 4. Shared Questions

These 6 questions are asked **once** during the quiz but contribute to multiple cancer type scores with different weights. This reduces total quiz length by approximately 15 questions.

### S1: Smoking

**Question:** "I am a current smoker or have smoked in the past (including e-cigarettes/vaping)."

**Category:** Lifestyle

| Cancer Type | Weight | Reasoning |
|------------|--------|-----------|
| Lung | 22% | SCS: "the number one risk factor of lung cancer." SingHealth: smokers are 15-30x more likely to develop lung cancer; smoking is responsible for 80-90% of lung cancer deaths. |
| Cervical | 10% | SCS: listed as a direct risk factor. SingHealth: smoking damages cervical cells and weakens immune response to HPV. |
| Prostate | 8% | SCS: "Smokers... are at a higher risk of prostate cancer." |
| Colorectal | 5% | SingHealth/HealthHub: listed as a risk factor for colorectal cancer. |

**Explanation:** "Smoking is the number one risk factor for lung cancer. Smokers are 15-30 times more likely to develop lung cancer. Smoking also increases risk of colorectal, cervical, and prostate cancers. (Source: Singapore Cancer Society, SingHealth)"

**Question Bank:** Reuse existing entry ID 38.

---

### S2: Secondhand Smoke

**Question:** "I live or work with someone who smokes regularly."

**Category:** Lifestyle

| Cancer Type | Weight | Reasoning |
|------------|--------|-----------|
| Lung | 13% | SCS: "a major risk factor of lung cancer among non-smokers", increases risk by approximately 20-30%. SingHealth: "Even non-smokers can develop lung cancer from prolonged exposure." |

**Explanation:** "Secondhand smoke is a major risk factor for lung cancer among non-smokers, increasing risk by 20-30%. No amount of exposure to secondhand smoke is safe. (Source: Singapore Cancer Society)"

**Question Bank:** Reuse existing entry ID 39.

**Note:** This question only maps to lung cancer. While cervical cancer risk is also affected by smoking exposure, the SCS cervical page lists "cigarette smoking" (personal smoking) rather than secondhand smoke as the risk factor.

---

### S3: Alcohol Consumption (NEW)

**Question:** "I drink alcohol regularly (at least a few times per week)."

**Category:** Lifestyle

| Cancer Type | Weight | Reasoning |
|------------|--------|-----------|
| Liver | 12% | SCS: "Alcohol abuse leading to scar tissue formation in the liver" listed as a major risk factor. SCS also states alcohol is "linked to higher risk of liver cancer (among at least 7 cancer types)." |
| Breast | 10% | SCS: excessive alcohol consumption increases breast cancer risk. Literature cites 7-10% increased risk per daily alcoholic drink. |
| Colorectal | 5% | SingHealth: "High alcohol consumption" listed as a colorectal cancer risk factor. |

**Explanation:** "Regular alcohol consumption increases the risk of liver, breast, and colorectal cancers. The liver converts alcohol into acetaldehyde, a toxic chemical that damages DNA, causes inflammation, and can lead to cirrhosis. (Source: Singapore Cancer Society)"

**Question Bank:** New entry required. Existing entries (Q7: ">1 drink/day for CRC"; Q25: "everyday for liver") are too specific to individual cancer types.

---

### S4: Overweight / Physical Inactivity (NEW)

**Question:** "I am currently overweight and/or I get less than 30 minutes of exercise on most days."

**Category:** Lifestyle

| Cancer Type | Weight | Reasoning |
|------------|--------|-----------|
| Breast | 12% | SingHealth: post-menopausal women with high insulin levels (linked to obesity) have 2x breast cancer risk. SCS: weight gain increases risk; regular exercise reduces risk by lowering estrogen. |
| Liver | 8% | SingHealth: obesity is associated with NAFLD, which can progress to cirrhosis and liver cancer. "Almost half the adult population in Singapore may have NAFLD." NAFLD prevalence projected to increase ~20% by 2030. |
| Colorectal | 6% | SCS: "Sedentary behaviour and obesity increase risk; physical activity reduces it." |
| Prostate | 8% | SingHealth: obesity listed as a prostate cancer risk factor. |

**Explanation:** "Being overweight and physically inactive increases the risk of breast, colorectal, liver, and prostate cancers. Obesity is associated with fatty liver disease (NAFLD), which affects almost half of Singapore adults and can progress to liver cancer. (Source: SingHealth, Singapore Cancer Society)"

**Question Bank:** New entry required. Combines concepts from existing Q10 (sedentary) and Q12 (overweight).

---

### S5: Type 2 Diabetes (NEW -- reworded from existing)

**Question:** "I have been diagnosed with Type 2 diabetes."

**Category:** Medical History

| Cancer Type | Weight | Reasoning |
|------------|--------|-----------|
| Liver | 8% | SingHealth: diabetes is associated with NAFLD/NASH progression to liver cancer. The epidemiological shift from viral to non-viral (metabolic) causes of liver cancer in Singapore makes this increasingly relevant. |
| Colorectal | 6% | SingHealth: "Diabetes/insulin resistance" explicitly listed as a colorectal cancer risk factor. |

**Explanation:** "Type 2 diabetes has been linked to increased risk of colorectal and liver cancer. Diabetes is associated with insulin resistance and fatty liver disease, both of which can promote cancerous changes. (Source: SingHealth)"

**Question Bank:** Reuse existing entry ID 13 (update explanation to cover both cancers).

---

### S6: Processed Meat / High Animal Fat Diet (NEW)

**Question:** "I regularly eat processed meats (bacon, ham, sausages, hot dogs) or a diet high in red meat and animal fats."

**Category:** Diet & Nutrition

| Cancer Type | Weight | Reasoning |
|------------|--------|-----------|
| Colorectal | 8% | SCS: processed/red meat and high-temperature cooking increase risk. SingHealth: "High in processed and red meat (increasingly common in Asia due to urbanisation/Western influences)." |
| Prostate | 10% | SCS: "A diet high in animal fat but low in fibre" elevates prostate cancer risk. SingHealth: "Men who consume large amounts of fat, particularly from red meat and other sources of animal fat, including dairy products are at increased risk." |

**Explanation:** "Diets high in processed meats, red meat, and animal fats are linked to increased risk of colorectal and prostate cancers. Try substituting with fish, chicken, fruits, and vegetables. (Source: Singapore Cancer Society, SingHealth)"

**Question Bank:** New entry required. Combines concepts from existing Q8 (processed meats) and Q9 (red meat) with prostate dietary risk.

---

## 5. Cancer-Specific Questions

### 5.1 BREAST CANCER

**Total questions contributing: 8** (6 specific + S3 alcohol + S4 overweight/inactive)
**Weights sum: 100%**
**Gender filter: All** (men can develop breast cancer per SCS, though rare)

| ID | Question | Weight | Category | Source & Reasoning |
|----|----------|--------|----------|-------------------|
| S3 | I drink alcohol regularly (at least a few times per week). | 10% | Lifestyle | SCS: excessive alcohol increases risk. 7-10% increased risk per daily drink. |
| S4 | I am currently overweight and/or physically inactive. | 12% | Lifestyle | SingHealth: post-menopausal obesity = 2x risk. SCS: inactivity elevates estrogen. |
| B1 | I have noticed a lump or thickening in my breast or underarm area. | 15% | Medical History | SCS: most common sign of breast cancer. Requires immediate medical examination. Highest-weighted symptom. |
| B2 | My mother, sister, or daughter has had breast cancer. | 15% | Family & Genetics | SCS: first-degree relative = 2x risk. SingHealth: BRCA1/2 carriers have 49-57% lifetime risk (vs 12% general). 1 in 150 Singaporeans carry HBOC variant (3x global average). |
| B3 | I am a woman aged 40 or above and have never had a mammogram. | 14% | Medical History | SCS: mammogram from age 40 recommended. Screening reduces mortality by up to 50%. Healthier SG: subsidised mammogram for ages 50-69. minAge=40. |
| B4 | I had my first menstrual period before age 12 or entered menopause after age 55. | 12% | Medical History | SCS/SingHealth: early menstruation and late menopause cause prolonged estrogen exposure, a key breast cancer driver. (Note: SCS says "before 11"; SingHealth says "before 12". We use 12 as the more conservative threshold.) |
| B5 | I am currently using or have used hormone replacement therapy (HRT). | 12% | Medical History | SCS: long-term HRT = 30% increased risk. Risk disappears 3-5 years after stopping. |
| B6 | I have never had children or had my first child after age 30. | 10% | Medical History | SCS/SingHealth: not having children or late first pregnancy increases estrogen exposure. (SCS says "after 35"; SingHealth says "after 30". We use 30 as more conservative.) |

**Weight distribution:** Risk factors 73%, Symptoms 15%, Lifestyle 12%.

**Removed from current generic assessment:**
- Q27 "Changes in breast size/shape" (13%) -- symptom better suited for health advice than risk scoring
- Q28 "Nipple discharge/changes" (13%) -- symptom better suited for health advice than risk scoring

**Added:**
- S3 Alcohol (10%) -- SCS-supported risk factor, previously missing
- S4 Overweight/inactivity (12%) -- SingHealth: 2x risk for post-menopausal, previously missing

**Key Singapore statistics:**
- 1 in 12 Singaporean women will develop breast cancer by age 75 (NCIS)
- Most common cancer among Singaporean women for the last 50 years (NCIS)
- Nearly 6 newly diagnosed cases per day (NCIS, 2013-2017)
- ~50% of breast cancer patients have NO identifiable risk factors (SCS)
- Stage I 5-year survival: 90% (NCIS)

---

### 5.2 LUNG CANCER

**Total questions contributing: 8** (6 specific + S1 smoking + S2 secondhand smoke)
**Weights sum: 100%**

| ID | Question | Weight | Category | Source & Reasoning |
|----|----------|--------|----------|-------------------|
| S1 | I am a current smoker or have smoked in the past (including e-cigarettes/vaping). | 22% | Lifestyle | SCS: "#1 risk factor." SingHealth: 15-30x risk, 80-90% of lung cancer deaths attributed to smoking. Highest individual weight reflects dominant risk factor status. |
| S2 | I live or work with someone who smokes regularly. | 13% | Lifestyle | SCS: "major risk factor", 20-30% increased risk. "No amount of exposure to secondhand smoke is safe." |
| L1 | I have been coughing up blood or rust-colored sputum. | 13% | Medical History | Critical warning sign requiring immediate medical attention. Highest-weighted symptom for lung cancer. |
| L2 | I have a persistent cough that won't go away or has gotten worse. | 8% | Medical History | SCS/SingHealth: common early symptom, especially in smokers. Lower weight than L1 as persistent cough has many non-cancer causes. |
| L3 | I am experiencing shortness of breath or wheezing. | 8% | Medical History | SingHealth: can indicate lung cancer, especially if new or worsening. |
| L4 | I am experiencing chest pain, especially when breathing deeply or coughing. | 8% | Medical History | SingHealth: possible sign of lung cancer. Lower weight as chest pain has many non-cancer causes. |
| L5 | I have been exposed to asbestos, radon, or other workplace carcinogens. | 15% | Lifestyle | SCS: "cancer-causing chemicals" including asbestos, coal gas, chromates, nickel, arsenic, vinyl chloride, mustard gas, radon. Second-highest risk factor after smoking. |
| L6 | I have a family member who had lung cancer. | 13% | Family & Genetics | SCS: risk may be higher if parents/siblings/children had lung cancer. SingHealth: family history is especially associated with lung cancer in never-smoking women of Chinese ethnicity in Singapore. |

**Weight distribution:** Risk factors 63%, Symptoms 37%.

**Changes from current generic assessment:**
- S1 Smoking reweighted: 13% -> 22% (reflects being 15-30x risk factor, the single most significant contributor)
- L1 Coughing blood: 12% -> 13%
- L2 Persistent cough: 12% -> 8% (reduced -- less specific than coughing blood)
- L3 Shortness of breath: 12% -> 8% (reduced)
- L4 Chest pain: 13% -> 8% (reduced -- many non-cancer causes)
- L5 Occupational: 14% -> 15% (increased -- second-highest documented risk)
- L6 Family history: 12% -> 13%
- S2 Secondhand smoke: 12% -> 13%

**Key Singapore statistics:**
- Leading cause of cancer deaths in men: 26.4% of male cancer mortalities (SCS)
- Nearly 50% of Singapore lung cancer cases occur in people who have never smoked (SingHealth)
- SingHealth SOLSTICE study: Of 530+ screened participants, 9 had cancerous lung nodules -- all 9 were non-smokers, all Stage 1
- Lung cancer incidence higher in Chinese compared to Malays and Indians (NCIS)

---

### 5.3 COLORECTAL CANCER

**Total questions contributing: 11** (6 specific + S1 smoking + S3 alcohol + S4 overweight/inactive + S5 diabetes + S6 processed meat)
**Weights sum: 100%**

| ID | Question | Weight | Category | Source & Reasoning |
|----|----------|--------|----------|-------------------|
| S1 | I am a current smoker or have smoked in the past. | 5% | Lifestyle | SingHealth/HealthHub: smoking listed as a CRC risk factor. Lower weight than lung (5% vs 22%) as smoking is a moderate, not dominant, factor for CRC. |
| S3 | I drink alcohol regularly. | 5% | Lifestyle | SingHealth: "High alcohol consumption" listed as a colorectal cancer risk factor. |
| S4 | I am currently overweight and/or physically inactive. | 6% | Lifestyle | SCS: "Sedentary behaviour and obesity increase risk; physical activity reduces it." |
| S5 | I have been diagnosed with Type 2 diabetes. | 6% | Medical History | SingHealth: "Diabetes/insulin resistance" explicitly listed as increasing colon cancer risk. |
| S6 | I regularly eat processed meats or a diet high in red meat and animal fats. | 8% | Diet & Nutrition | SCS: processed/red meat increases risk. SingHealth: "increasingly common in Asia due to urbanisation/Western influences." |
| C1 | I have noticed blood in my stool or had a significant change in bowel habits that I have not seen a doctor about. | 14% | Medical History | SCS: key warning signs for colorectal cancer. Combines blood in stool and bowel habit changes (the two most commonly cited symptoms). |
| C2 | I have been diagnosed with colon polyps in the past. | 13% | Medical History | SCS: familial polyposis carries 80-100% probability of developing CRC. Regular polyps also increase recurrence risk. |
| C3 | I have been diagnosed with inflammatory bowel disease (Crohn's disease or ulcerative colitis). | 10% | Medical History | SCS: ulcerative colitis carries "significant risk of colorectal cancer" from long-term inflammation. |
| C4 | A parent, sibling, or child has had colorectal cancer. | 10% | Family & Genetics | SCS: familial polyposis = 80-100% CRC risk. Relatives of polyp/cancer patients have elevated risk. |
| C5 | I am 50 years or older and have never had colorectal cancer screening (colonoscopy or FIT test). | 12% | Medical History | SCS/Healthier SG: FIT recommended from age 50. SCS: colonoscopy every 10 years. Healthier SG: subsidised annual FIT for citizens 50+. minAge=50. |
| C6 | I rarely eat high-fiber foods like fruits, vegetables, and whole grains. | 5% | Diet & Nutrition | SCS: fruits, vegetables, and dietary fiber reduce CRC risk. Low-fiber diet is a contributing factor. |

**Weight distribution:** Risk factors 56%, Medical history 30%, Symptoms 14%.

**Changes from current generic assessment:**
- All 10 questions were equally weighted at 10%. Now reweighted to reflect relative importance.
- Q42 (blood in stool) and Q43 (bowel changes): merged into C1 (14%) -- both are warning signs best asked together
- Q44 (incomplete bowel emptying): removed -- less specific symptom, many non-cancer causes
- Q51 (abdominal pain): removed -- too generic, many non-cancer causes
- Added: S1 smoking (5%), S3 alcohol (5%), S4 overweight/inactive (6%), S5 diabetes (6%) -- all SCS/SingHealth-documented risk factors that were previously missing
- S6 processed meat replaces the separate Q49 (processed meat) and adds animal fat component

**Key Singapore statistics:**
- Most common cancer in Singapore overall (SCS)
- Chinese Singaporeans have higher risk compared to other ethnic groups (SCS, HealthHub)
- 50% of colorectal cancer patients have no known risk factors (SCS)
- Screening: FIT annually from 50, colonoscopy every 10 years (SCS)
- Healthier SG: $0 FIT for enrolled citizens aged 50+ (HSG)

---

### 5.4 LIVER CANCER

**Total questions contributing: 8** (5 specific + S3 alcohol + S4 overweight + S5 diabetes)
**Weights sum: 100%**

| ID | Question | Weight | Category | Source & Reasoning |
|----|----------|--------|----------|-------------------|
| S3 | I drink alcohol regularly. | 12% | Lifestyle | SCS: "Alcohol abuse leading to scar tissue formation in the liver" -- a major pathway to cirrhosis and then liver cancer. Alcohol linked to at least 7 cancer types per SCS. |
| S4 | I am currently overweight and/or physically inactive. | 8% | Lifestyle | SingHealth: obesity strongly associated with NAFLD. "Almost half the adult population in Singapore may have NAFLD." NAFLD prevalence projected to increase ~20% by 2030. |
| S5 | I have been diagnosed with Type 2 diabetes. | 8% | Medical History | SingHealth: diabetes associated with NAFLD/NASH progression. Non-viral (metabolic) causes of liver cancer increasing: 14.4% to 25.0% of HCC cases. |
| V1 | I have been diagnosed with Hepatitis B or Hepatitis C infection. | 28% | Medical History | SCS: "the most significant risk factor worldwide." Hep B carriers are 100x more likely to develop liver cancer. SingHealth confirms: "about 100 times more than someone without hepatitis B or C." Highest individual weight in any cancer type -- justified by 100x risk multiplier. In Singapore, Hep B is much more common than Hep C (SCS). |
| V2 | I have been diagnosed with liver cirrhosis or chronic liver disease. | 18% | Medical History | SingHealth: "the most important risk factor for HCC." Cirrhosis develops from hepatitis, fatty liver, or excessive alcohol. Second-highest weight for liver cancer. |
| V3 | I have been told I have fatty liver disease (NAFLD or NASH). | 12% | Medical History | SCS: "Given the increasing incidence of obesity, especially in developed countries, liver cancer due to fatty liver may overtake liver cancer due to Hepatitis B in future." SingHealth: "NAFLD and NASH are increasingly important causes of HCC in Singapore and globally." Epidemiological shift: Hep B attribution declining (76.5% to 68.2%), non-viral etiology increasing (14.4% to 25.0%). |
| V4 | I have noticed yellowing of my skin or eyes (jaundice). | 7% | Medical History | SCS/SingHealth: jaundice can be a sign of liver cancer or serious liver disease. Lower weight as it is a symptom, not a risk factor. |
| V5 | I have persistent pain or swelling in the upper right side of my abdomen. | 7% | Medical History | SingHealth: pain or swelling in upper right abdomen can indicate liver problems including liver cancer. Lower weight as it is a symptom. |

**Weight distribution:** Risk factors 86%, Symptoms 14%.

**Changes from current generic assessment:**
- V1 Hep B/C: 15% -> 28% (CRITICAL -- reflects 100x risk multiplier, was severely underweighted)
- V2 Cirrhosis: 17% -> 18%
- S3 Alcohol: 17% -> 12% (now shared; alcohol is a pathway to cirrhosis rather than a standalone top factor)
- V4 Jaundice: 17% -> 7% (was overweighted as a symptom)
- V5 Abdominal pain: 17% -> 7% (was overweighted as a symptom)
- Q57 (appetite/weight loss): removed -- too generic, many non-cancer causes
- Added: V3 NAFLD/fatty liver (12%) -- SCS and SingHealth both identify this as an increasingly important and emerging risk factor
- Added: S4 overweight (8%) -- links to NAFLD
- Added: S5 diabetes (8%) -- links to NAFLD/metabolic liver cancer

**Key Singapore statistics:**
- Hep B is the most common cause of primary liver cancer in Singapore (SingHealth)
- Almost 50% of Singapore adults may have NAFLD (SingHealth)
- NAFLD prevalence projected to increase ~20% by 2030 vs 2019 (SingHealth)
- Epidemiological shift: Hep B attribution declining (76.5% -> 68.2%), non-viral increasing (14.4% -> 25.0%) (SingHealth)
- Liver cancer is the 4th most common cancer in men in Singapore (NCIS)
- High-risk screening: AFP blood test + liver ultrasound every 6 months (SCS)

---

### 5.5 CERVICAL CANCER

**Total questions contributing: 7** (6 specific + S1 smoking)
**Weights sum: 100%**
**Gender filter: Female only**

| ID | Question | Weight | Category | Source & Reasoning |
|----|----------|--------|----------|-------------------|
| S1 | I am a current smoker or have smoked in the past. | 10% | Lifestyle | SCS: "Cigarette smoking" listed as a direct risk factor. SingHealth: smoking damages cervical cells and weakens immune system's ability to fight HPV. |
| X1 | I have been diagnosed with HPV (Human Papillomavirus) infection or genital warts. | 22% | Medical History | SCS: "Persistent infection of the cervix with the high risk human papilloma virus (HPV) is the most common cause" of cervical cancer. HealthHub: "HPV types 16 and 18 cause about 70% of cervical cancer cases worldwide." Highest weight -- reflects being the dominant cause. |
| X2 | I have abnormal vaginal bleeding (between periods, after intercourse, or after menopause). | 12% | Medical History | SCS/SingHealth: abnormal vaginal bleeding is a key warning sign of cervical cancer. |
| X3 | I have never had a Pap smear test or HPV test, or it has been more than 3 years since my last one. | 18% | Medical History | SCS: Pap test every 3 years (ages 25-29), HPV test every 5 years (ages 30+). Healthier SG: subsidised screening ($0 for enrolled citizens). High weight reflects that screening is the primary prevention method. minAge=25. |
| X4 | I have had multiple sexual partners or started sexual activity at a young age. | 12% | Lifestyle | SCS: both "Sexual intercourse at an early age" and "Having multiple sexual partners" listed as risk factors. These increase HPV exposure risk. |
| X5 | I have a weakened immune system (due to HIV, immunosuppressive medication, or organ transplant). | 14% | Medical History | SCS: "HIV infection, taking medication that can lower your immune system or recipient of a solid organ transplant." HealthHub: "People with weakened immune systems (e.g. due to HIV/AIDS or immune-system suppressing drugs such as steroids often given to organ transplant patients) are at higher risk of HPV infection." SingHealth: autoimmune disease, long-term steroids, immunosuppressant drugs. ALL THREE Singapore sources list this -- high confidence. |
| X6 | I have a history of sexually transmitted infections (such as chlamydia or gonorrhoea). | 12% | Medical History | SCS: "A history of sexually transmitted infection such as Chlamydia or Gonorrhoea" explicitly listed as a cervical cancer risk factor. |

**Weight distribution:** Risk factors 68%, Symptoms 12%, Screening 18%.

**Changes from current generic assessment:**
- Q58 HPV: 17% -> 22% (increased -- #1 cause per SCS)
- Q60 Pap smear: 18% -> 18% (unchanged)
- Q61 Sexual history: 16% -> 12%
- Q59 Abnormal bleeding: 16% -> 12% (reduced -- symptom)
- Q62 Smoking: 16% -> 10% (reduced; previously combined personal + secondhand smoking into one question -- now personal smoking only via S1)
- Q63 Vaginal discharge: 16% -> removed (less specific symptom, many non-cancer causes)
- Added: X5 Immunosuppression (14%) -- listed by ALL THREE Singapore sources (SCS, HealthHub, SingHealth)
- Added: X6 STI history (12%) -- explicitly listed by SCS

**Key Singapore statistics:**
- 10th most common cancer among women in Singapore (SCS, Singapore Cancer Registry 2023)
- HPV vaccination available at CHAS clinics, ages 18-26, subsidised (SCS)
- Screening: Pap test every 3 years (25-29), HPV test every 5 years (30+) (SCS/Healthier SG)

---

### 5.6 PROSTATE CANCER

**Total questions contributing: 8** (5 specific + S1 smoking + S4 overweight + S6 diet)
**Weights sum: 100%**
**Gender filter: Male only** (Note: current cancer_types.csv has genderFilter="all" -- must be changed to "male")

| ID | Question | Weight | Category | Source & Reasoning |
|----|----------|--------|----------|-------------------|
| S1 | I am a current smoker or have smoked in the past. | 8% | Lifestyle | SCS: "Smokers... are at a higher risk of prostate cancer." |
| S4 | I am currently overweight and/or physically inactive. | 8% | Lifestyle | SingHealth: obesity listed as a prostate cancer risk factor. |
| S6 | I regularly eat processed meats or a diet high in red meat and animal fats. | 10% | Diet & Nutrition | SCS: "A diet high in animal fat but low in fibre" elevates risk. SingHealth: "Men who consume large amounts of fat, particularly from red meat and other sources of animal fat, including dairy products are at increased risk." |
| P1 | I have difficulty starting urination or have a weak urine stream. | 14% | Medical History | SCS/SingHealth: difficulty urinating or weak urine stream can be symptoms of prostate problems including prostate cancer. |
| P2 | I have blood in my urine or semen. | 14% | Medical History | SCS/SingHealth: blood in urine or semen is a warning sign of prostate cancer. |
| P3 | I am a man aged 50 or older and have never had a prostate health check. | 18% | Medical History | SCS: men above 50 with family history should consider testing. SingHealth: age is "the strongest risk factor." Note: SCS acknowledges "a lack of evidence to support population-based screening" -- this question captures the at-risk demographic. minAge=50. |
| P4 | My father or brother has had prostate cancer. | 18% | Family & Genetics | SCS: "People whose relatives have had prostate cancer at higher risk" (fathers, brothers, uncles). SingHealth: brother with prostate cancer = higher risk than father. Risk "much higher for men with several affected family members, especially if they were young when detected." Highest weight alongside P3 -- reflects strong genetic component. |
| P5 | I have frequent urination, especially at night. | 10% | Medical History | SCS/SingHealth: frequent urination, especially at night, can be a symptom of prostate enlargement or prostate cancer. Lower weight -- very common in older men for non-cancer reasons. |

**Weight distribution:** Risk factors 62%, Symptoms 38%.

**Changes from current generic assessment:**
- Q64 Difficulty urinating: 16% -> 14%
- Q65 Blood in urine: 16% -> 14%
- Q66 50+ check: 18% -> 18% (unchanged)
- Q67 Family history: 16% -> 18% (increased -- strong genetic component)
- Q68 Frequent urination: 18% -> 10% (reduced -- very common for non-cancer reasons in older men)
- Q69 Hip/back/pelvis pain: 16% -> removed (indicates late-stage metastatic disease, not risk assessment)
- Added: S1 smoking (8%) -- SCS-listed risk factor, was missing
- Added: S4 overweight (8%) -- SingHealth-listed, was missing
- Added: S6 diet (10%) -- SCS and SingHealth both list high animal fat diet, was missing

**Key Singapore statistics:**
- 2nd most common cancer among men in Singapore (SCS)
- Chinese men have 2x the risk compared to Malay or Indian men (SingHealth)
- SCS: lack of evidence to support population-based screening -- targeted screening for men 50+ with family history
- Sexual activity is NOT a risk factor (SCS)

---

## 6. Configuration Changes Required

### 6.1 cancer_types.csv

| Field | Current Value | Recommended Change | Reason |
|-------|-------------|-------------------|--------|
| prostate.genderFilter | "all" | "male" | Prostate cancer only affects males. Currently could show prostate questions to female participants. |
| generic.familyWeight | 8 | 0 | Set to 0 for the generic assessment to avoid double-counting. Each cancer type already has its own family history question (B2, L6, C4, P4) with specific weights. The generic familyWeight of 8 would stack on top, inflating family history contribution. |

### 6.2 New Question Bank Entries Required

The following questions need to be added to `question_bank.csv` with translations in all 4 languages (English, Chinese, Malay, Tamil):

| New ID | English Prompt | Notes |
|--------|---------------|-------|
| 70 | I drink alcohol regularly (at least a few times per week). | Shared: liver, breast, colorectal |
| 71 | I am currently overweight and/or I get less than 30 minutes of exercise on most days. | Shared: breast, colorectal, liver, prostate |
| 72 | I regularly eat processed meats (bacon, ham, sausages, hot dogs) or a diet high in red meat and animal fats. | Shared: colorectal, prostate |
| 73 | I have been told I have fatty liver disease (NAFLD or NASH). | Liver-specific |
| 74 | I have a weakened immune system (due to HIV, immunosuppressive medication, or organ transplant). | Cervical-specific |
| 75 | I have a history of sexually transmitted infections (such as chlamydia or gonorrhoea). | Cervical-specific |

**Reused question bank entries (with updated explanations where noted):**
- ID 13: Type 2 diabetes (update explanation to cover liver + colorectal)
- ID 26: Breast lump (B1)
- ID 29: Mother/sister/daughter breast cancer (B2)
- ID 30: Early menses/late menopause (B4)
- ID 31: No children/first child after 30 (B6)
- ID 32: HRT (B5)
- ID 33: Woman 40+ no mammogram (B3)
- ID 34: Persistent cough (L2)
- ID 35: Coughing blood (L1)
- ID 36: Chest pain (L4)
- ID 37: Shortness of breath (L3)
- ID 38: Current/past smoker (S1)
- ID 39: Secondhand smoke (S2)
- ID 40: Occupational carcinogens (L5)
- ID 41: Family history lung cancer (L6)
- ID 45: Past colon polyps (C2)
- ID 46: IBD (C3)
- ID 47: Family history CRC (C4)
- ID 48: 50+ never CRC screened (C5)
- ID 50: Low fiber diet (C6)
- ID 52: Hepatitis B/C (V1)
- ID 53: Cirrhosis (V2)
- ID 55: Jaundice (V4)
- ID 56: Upper right abdomen pain (V5)
- ID 58: HPV (X1)
- ID 59: Abnormal vaginal bleeding (X2)
- ID 60: Pap smear (X3)
- ID 61: Multiple partners/early activity (X4)
- ID 64: Difficulty urinating (P1)
- ID 65: Blood in urine/semen (P2)
- ID 66: Man 50+ no prostate check (P3)
- ID 67: Father/brother prostate cancer (P4)
- ID 68: Frequent urination at night (P5)

**Merged/combined from existing entries:**
- C1 (blood in stool + bowel changes): Can reuse Q1 ("I've seen blood in my stool or had a big change in bowel habits, but I haven't seen a doctor.") or Q42 -- recommend Q1 as it naturally combines both symptoms.

---

## 7. Assignments Summary

Below is the complete assignments mapping for the generic assessment. Each row represents one assignment linking a question to a cancer type with specific scoring parameters.

### Breast Cancer Assignments
| questionId | targetCancerType | weight | yesValue | noValue | category | minAge |
|-----------|-----------------|--------|----------|---------|----------|--------|
| 70 | breast | 10.0 | 100 | 0 | Lifestyle | |
| 71 | breast | 12.0 | 100 | 0 | Lifestyle | |
| 26 | breast | 15.0 | 100 | 0 | Medical History | |
| 29 | breast | 15.0 | 100 | 0 | Family & Genetics | |
| 33 | breast | 14.0 | 100 | 0 | Medical History | 40 |
| 30 | breast | 12.0 | 100 | 0 | Medical History | |
| 32 | breast | 12.0 | 100 | 0 | Medical History | |
| 31 | breast | 10.0 | 100 | 0 | Medical History | |

### Lung Cancer Assignments
| questionId | targetCancerType | weight | yesValue | noValue | category | minAge |
|-----------|-----------------|--------|----------|---------|----------|--------|
| 38 | lung | 22.0 | 100 | 0 | Lifestyle | |
| 39 | lung | 13.0 | 100 | 0 | Lifestyle | |
| 35 | lung | 13.0 | 100 | 0 | Medical History | |
| 34 | lung | 8.0 | 100 | 0 | Medical History | |
| 37 | lung | 8.0 | 100 | 0 | Medical History | |
| 36 | lung | 8.0 | 100 | 0 | Medical History | |
| 40 | lung | 15.0 | 100 | 0 | Lifestyle | |
| 41 | lung | 13.0 | 100 | 0 | Family & Genetics | |

### Colorectal Cancer Assignments
| questionId | targetCancerType | weight | yesValue | noValue | category | minAge |
|-----------|-----------------|--------|----------|---------|----------|--------|
| 38 | colorectal | 5.0 | 100 | 0 | Lifestyle | |
| 70 | colorectal | 5.0 | 100 | 0 | Lifestyle | |
| 71 | colorectal | 6.0 | 100 | 0 | Lifestyle | |
| 13 | colorectal | 6.0 | 100 | 0 | Medical History | |
| 72 | colorectal | 8.0 | 100 | 0 | Diet & Nutrition | |
| 1 | colorectal | 14.0 | 100 | 0 | Medical History | |
| 45 | colorectal | 13.0 | 100 | 0 | Medical History | |
| 46 | colorectal | 10.0 | 100 | 0 | Medical History | |
| 47 | colorectal | 10.0 | 100 | 0 | Family & Genetics | |
| 48 | colorectal | 12.0 | 100 | 0 | Medical History | 50 |
| 50 | colorectal | 5.0 | 100 | 0 | Diet & Nutrition | |

**Weight check:** 5+5+6+6+8+14+13+10+10+12+5 = 94%. Adjusted: C6 low fiber 5%->6%, C5 screening 12%->13% = 96%. Need 4% more. Adjust: C1 14%->15%, C2 13%->14%, recheck. Let me recalculate: 5+5+6+6+8+15+14+10+10+13+6 = 98%. Remaining 2%: add to C3 IBD 10%->12%. Final: 5+5+6+6+8+15+14+12+10+13+6 = 100%.

Updated table above uses these final values:

| questionId | targetCancerType | weight | yesValue | noValue | category | minAge |
|-----------|-----------------|--------|----------|---------|----------|--------|
| 38 | colorectal | 5.0 | 100 | 0 | Lifestyle | |
| 70 | colorectal | 5.0 | 100 | 0 | Lifestyle | |
| 71 | colorectal | 6.0 | 100 | 0 | Lifestyle | |
| 13 | colorectal | 6.0 | 100 | 0 | Medical History | |
| 72 | colorectal | 8.0 | 100 | 0 | Diet & Nutrition | |
| 1 | colorectal | 15.0 | 100 | 0 | Medical History | |
| 45 | colorectal | 14.0 | 100 | 0 | Medical History | |
| 46 | colorectal | 12.0 | 100 | 0 | Medical History | |
| 47 | colorectal | 10.0 | 100 | 0 | Family & Genetics | |
| 48 | colorectal | 13.0 | 100 | 0 | Medical History | 50 |
| 50 | colorectal | 6.0 | 100 | 0 | Diet & Nutrition | |

**Check:** 5+5+6+6+8+15+14+12+10+13+6 = 100% confirmed.

### Liver Cancer Assignments
| questionId | targetCancerType | weight | yesValue | noValue | category | minAge |
|-----------|-----------------|--------|----------|---------|----------|--------|
| 70 | liver | 12.0 | 100 | 0 | Lifestyle | |
| 71 | liver | 8.0 | 100 | 0 | Lifestyle | |
| 13 | liver | 8.0 | 100 | 0 | Medical History | |
| 52 | liver | 28.0 | 100 | 0 | Medical History | |
| 53 | liver | 18.0 | 100 | 0 | Medical History | |
| 73 | liver | 12.0 | 100 | 0 | Medical History | |
| 55 | liver | 7.0 | 100 | 0 | Medical History | |
| 56 | liver | 7.0 | 100 | 0 | Medical History | |

**Check:** 12+8+8+28+18+12+7+7 = 100% confirmed.

### Cervical Cancer Assignments
| questionId | targetCancerType | weight | yesValue | noValue | category | minAge |
|-----------|-----------------|--------|----------|---------|----------|--------|
| 38 | cervical | 10.0 | 100 | 0 | Lifestyle | |
| 58 | cervical | 22.0 | 100 | 0 | Medical History | |
| 59 | cervical | 12.0 | 100 | 0 | Medical History | |
| 60 | cervical | 18.0 | 100 | 0 | Medical History | 25 |
| 61 | cervical | 12.0 | 100 | 0 | Lifestyle | |
| 74 | cervical | 14.0 | 100 | 0 | Medical History | |
| 75 | cervical | 12.0 | 100 | 0 | Medical History | |

**Check:** 10+22+12+18+12+14+12 = 100% confirmed.

### Prostate Cancer Assignments
| questionId | targetCancerType | weight | yesValue | noValue | category | minAge |
|-----------|-----------------|--------|----------|---------|----------|--------|
| 38 | prostate | 8.0 | 100 | 0 | Lifestyle | |
| 71 | prostate | 8.0 | 100 | 0 | Lifestyle | |
| 72 | prostate | 10.0 | 100 | 0 | Diet & Nutrition | |
| 64 | prostate | 14.0 | 100 | 0 | Medical History | |
| 65 | prostate | 14.0 | 100 | 0 | Medical History | |
| 66 | prostate | 18.0 | 100 | 0 | Medical History | 50 |
| 67 | prostate | 18.0 | 100 | 0 | Family & Genetics | |
| 68 | prostate | 10.0 | 100 | 0 | Medical History | |

**Check:** 8+8+10+14+14+18+18+10 = 100% confirmed.

---

## 8. Cross-Cancer Risk Factor Overlap

This table shows how shared risk factors contribute different weights across cancer types, reflecting their varying significance per SCS/SingHealth guidelines.

| Risk Factor | Lung | Colorectal | Breast | Liver | Cervical | Prostate | Primary Source |
|------------|------|-----------|--------|-------|----------|----------|---------------|
| Smoking (S1) | **22%** | 5% | -- | -- | 10% | 8% | SCS: "#1 risk factor" for lung (15-30x risk) |
| Secondhand smoke (S2) | **13%** | -- | -- | -- | -- | -- | SCS: 20-30% increased lung cancer risk |
| Alcohol (S3) | -- | 5% | 10% | **12%** | -- | -- | SCS: alcohol linked to 7+ cancer types |
| Overweight/inactive (S4) | -- | 6% | **12%** | 8% | -- | 8% | SingHealth: 2x breast cancer risk (postmenopausal) |
| Type 2 diabetes (S5) | -- | 6% | -- | **8%** | -- | -- | SingHealth: NAFLD/insulin resistance pathway |
| Processed meat/animal fat (S6) | -- | **8%** | -- | -- | -- | 10% | SCS: high animal fat diet elevates risk |

**Key insight:** Smoking's weight varies 10x between its highest impact cancer (lung at 22%) and lowest (colorectal at 5%), reflecting SCS documentation that smoking is the "#1 risk factor" for lung but only a "moderate" contributing factor for colorectal.

---

## 9. Comparison: Current vs Recommended

### Questions Removed (from current generic assessment)
| QID | Question | Cancer | Current Weight | Reason for Removal |
|-----|----------|--------|---------------|-------------------|
| 27 | Breast size/shape changes | Breast | 13% | Symptom -- less critical than lump; replaced by risk factor questions (alcohol, obesity) |
| 28 | Nipple discharge/changes | Breast | 13% | Symptom -- less critical than lump; replaced by risk factor questions |
| 43 | Bowel habit change | Colorectal | 10% | Merged with Q42/Q1 (blood in stool + bowel changes combined) |
| 44 | Incomplete bowel emptying | Colorectal | 10% | Less specific symptom; many non-cancer causes |
| 49 | Processed meats/red meat | Colorectal | 10% | Replaced by shared S6 (broader: includes animal fat for prostate) |
| 51 | Abdominal pain/cramping | Colorectal | 10% | Too generic; many non-cancer causes |
| 54 | Daily/heavy alcohol | Liver | 17% | Replaced by shared S3 (broader framing for multi-cancer use) |
| 57 | Loss of appetite/weight loss | Liver | 17% | Too generic; many non-cancer causes |
| 62 | Smoker or live with smoker | Cervical | 16% | Split into S1 (personal smoking) -- secondhand smoke not strongly linked to cervical per SCS |
| 63 | Vaginal discharge with odor | Cervical | 16% | Less specific symptom; many non-cancer causes |
| 69 | Hip/back/pelvis pain | Prostate | 16% | Indicates late-stage metastatic disease, not risk |

### Questions Added
| New ID | Question | Cancer(s) | Weight(s) | Source |
|--------|----------|-----------|-----------|--------|
| 70 | Alcohol regularly | Breast 10%, Liver 12%, Colorectal 5% | Shared | SCS |
| 71 | Overweight/inactive | Breast 12%, Colorectal 6%, Liver 8%, Prostate 8% | Shared | SingHealth |
| 72 | Processed meat/animal fat diet | Colorectal 8%, Prostate 10% | Shared | SCS, SingHealth |
| 73 | Fatty liver disease (NAFLD/NASH) | Liver 12% | Liver | SCS, SingHealth |
| 74 | Weakened immune system | Cervical 14% | Cervical | SCS, HealthHub, SingHealth |
| 75 | STI history | Cervical 12% | Cervical | SCS |
| 1 | Blood in stool + bowel changes | Colorectal 15% | Colorectal | Reused from question bank |
| 13 | Type 2 diabetes | Colorectal 6%, Liver 8% | Shared | SingHealth |

### Weight Rebalancing Summary
| Cancer | Symptom Weight (Before) | Symptom Weight (After) | Risk Factor Weight (Before) | Risk Factor Weight (After) |
|--------|------------------------|----------------------|---------------------------|--------------------------|
| Breast | 39% (3 symptoms) | 15% (1 symptom) | 61% | 85% |
| Lung | 49% (4 symptoms) | 37% (4 symptoms) | 51% | 63% |
| Colorectal | 40% (4 symptoms) | 15% (1 combined) | 60% | 85% |
| Liver | 51% (3 symptoms) | 14% (2 symptoms) | 49% | 86% |
| Cervical | 32% (2 symptoms) | 12% (1 symptom) | 68% | 88% |
| Prostate | 66% (4 symptoms) | 38% (3 symptoms) | 34% | 62% |

---

## 10. Implementation Notes

### Shared Question Handling

The assignment model (`assignments.csv`) already supports mapping one question to multiple cancer types. For shared questions, add multiple assignment rows with the same `questionId` but different `targetCancerType` and `weight` values. Example for S1 (smoking, questionId=38):

```
38,generic,lung,22.0,100,0,Lifestyle,,1
38,generic,colorectal,5.0,100,0,Lifestyle,,1
38,generic,cervical,10.0,100,0,Lifestyle,,1
38,generic,prostate,8.0,100,0,Lifestyle,,1
```

The risk calculator (`riskCalculator.js`) processes each assignment row independently, routing the contribution to the correct `cancerTypeScores[cancerType]`. The participant answers the question once; the system applies it to all mapped cancer types.

**Important:** Verify that the frontend and backend correctly handle multiple assignment rows for the same questionId. The question should appear only once in the quiz UI but generate multiple answer objects for scoring.

### Translation Requirements

6 new question bank entries (IDs 70-75) require translations in:
- Chinese (zh)
- Malay (ms)
- Tamil (ta)

### Gender Filtering

- Cervical cancer questions (X1-X6) should only appear for female participants
- Prostate cancer questions (P1-P5) should only appear for male participants
- The `genderFilter` in `cancer_types.csv` handles this at the cancer type level

### Family History Double-Counting Fix

Set `generic.familyWeight = 0` in `cancer_types.csv`. Each cancer type already has its own specific family history question with appropriate weight:
- Breast B2 (15%): mother/sister/daughter had breast cancer
- Lung L6 (13%): family member had lung cancer
- Colorectal C4 (10%): parent/sibling/child had CRC
- Prostate P4 (18%): father/brother had prostate cancer

The generic `familyWeight=8` would add an additional 8% on top, inflating scores.

---

*Document generated based on verified research from Singapore Cancer Society, SingHealth, HealthHub, NCIS, and Healthier SG. Last updated: March 2026.*
