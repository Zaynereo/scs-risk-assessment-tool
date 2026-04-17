-- Email i18n Translation Keys Migration
-- Adds 10 new translation keys under the `results` group used by the
-- assessment-results email (Your Information section, labels, subject line,
-- and fallback strings). Idempotent: merges into the existing translations
-- JSON rather than replacing it. Run once per environment.
-- Location: settings.ui_translations (jsonb row keyed by 'ui_translations').

UPDATE settings
SET value = jsonb_set(
    value,
    '{results}',
    (COALESCE(value->'results', '{}'::jsonb)) || jsonb_build_object(
        'yourInformation',         jsonb_build_object('en','Your Information','ms','Maklumat Anda','ta','உங்கள் தகவல்','zh','您的信息'),
        'ageLabel',                jsonb_build_object('en','Age','ms','Umur','ta','வயது','zh','年龄'),
        'genderLabel',             jsonb_build_object('en','Gender','ms','Jantina','ta','பாலினம்','zh','性别'),
        'ethnicityLabel',          jsonb_build_object('en','Ethnicity','ms','Etnik','ta','இனம்','zh','种族'),
        'familyHistoryLabel',      jsonb_build_object('en','Family History','ms','Sejarah Keluarga','ta','குடும்ப வரலாறு','zh','家族病史'),
        'assessmentTypeLabel',     jsonb_build_object('en','Assessment Type','ms','Jenis Penilaian','ta','மதிப்பீடு வகை','zh','评估类型'),
        'emailSubject',            jsonb_build_object('en','Your {type} Cancer Risk Assessment Results','ms','Keputusan Penilaian Risiko Kanser {type} Anda','ta','உங்கள் {type} புற்றுநோய் ஆபத்து மதிப்பீடு முடிவுகள்','zh','您的{type}癌症风险评估结果'),
        'emailSubjectGeneric',     jsonb_build_object('en','Your General Cancer Risk Assessment Results','ms','Keputusan Penilaian Risiko Kanser Umum Anda','ta','உங்கள் பொது புற்றுநோய் ஆபத்து மதிப்பீடு முடிவுகள்','zh','您的综合癌症风险评估结果'),
        'riskFactorFallback',      jsonb_build_object('en','Risk factors identified in this category.','ms','Faktor risiko dikenal pasti dalam kategori ini.','ta','இந்த வகையில் ஆபத்து காரணிகள் அடையாளம் காணப்பட்டுள்ளன.','zh','已在此类别中识别出风险因素。'),
        'recommendationsFallback', jsonb_build_object('en','Maintain a healthy lifestyle and schedule regular check-ups with your doctor.','ms','Kekalkan gaya hidup sihat dan jadualkan pemeriksaan berkala dengan doktor anda.','ta','ஆரோக்கியமான வாழ்க்கை முறையை பராமரித்து மருத்துவரிடம் வழக்கமான பரிசோதனைகளைத் திட்டமிடுங்கள்.','zh','保持健康的生活方式，定期与医生预约检查。')
    ),
    true
),
updated_at = NOW()
WHERE key = 'ui_translations';
