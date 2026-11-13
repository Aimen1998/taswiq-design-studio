# Contributing · المساهمة

Thank you for helping. · شكراً لمساهمتك.

## Before a pull request · قبل طلب الدمج
1. `npm ci`
2. `npm run typecheck && npm test && npm run build` must all pass. · يجب أن تنجح الثلاثة.
3. Add or update a test for any behaviour you change (`src/*.test.ts`). · أضف اختباراً لكل سلوك تغيّره.
4. Keep the three languages in `src/strings.ts` in step (ar, fr, en). · حدّث اللغات الثلاث معاً.
5. Phone first: test at 390 px wide, 44 px tap targets, 16 px text. · الهاتف أولاً.

## Rules · قواعد
- No secrets, keys, tokens, account ids or private URLs in code, tests or screenshots. CI runs gitleaks on every push.
  · لا أسرار ولا مفاتيح ولا معرّفات حسابات في الكود أو الاختبارات أو اللقطات.
- No dependency, font, model or picture with a "non-commercial" or unclear license. Add every new component to `NOTICE`.
  · لا مكوّن برخصة «غير تجارية»، وكل مكوّن جديد يُذكر في `NOTICE`.
- Design files are validated by `src/design.ts`; never widen what an image source may point to without a test.
  · ملفات التصميم تُفحص في `src/design.ts`، ولا تُوسَّع مصادر الصور دون اختبار.
- By contributing you agree your work is licensed under AGPL-3.0. · مساهمتك تُنشر برخصة AGPL-3.0.

## Security · الأمان
Report a vulnerability privately through GitHub's "Report a vulnerability" (Security tab), not in a public issue.
