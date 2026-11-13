# Contributing · المساهمة

Thank you for helping. Outside contributions are welcome. · شكراً لمساهمتك، والمساهمات من خارج المشروع مرحّب بها.

## How · الطريقة
1. Open an issue first for anything bigger than a small fix, so we agree on the approach. · افتح بلاغاً أولاً لأي تغيير أكبر من إصلاح صغير.
2. Fork, make a branch, open a pull request against `main`. · انسخ المستودع، وأنشئ فرعاً، وافتح طلب دمج إلى `main`.
3. Sign the CLA when the check asks (once). · وقّع الاتفاقية حين يطلبها الفحص، مرة واحدة.
4. CI (gitleaks, typecheck, tests, build) and the CLA check must pass. · يجب أن ينجح CI وفحص الاتفاقية.

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
- **Sign the Contributor License Agreement ([CLA.md](CLA.md)) once.** On your first pull request the CLA check asks
  you to post: `I have read the CLA Document and I hereby sign the CLA`. A pull request cannot be merged until it passes.
  You keep your copyright; the CLA lets the maintainer also use your work in TaswiQ, and your work stays public under AGPL-3.0.
  · **وقّع اتفاقية المساهمة ([CLA.md](CLA.md)) مرة واحدة.** في أول طلب دمج يطلب منك فحص الاتفاقية كتابة التعليق أعلاه،
  ولا يُدمج الطلب قبل نجاحه. يبقى حق المؤلف لك، وتبقى مساهمتك منشورة برخصة AGPL-3.0.

## Security · الأمان
Report a vulnerability privately through GitHub's "Report a vulnerability" (Security tab), not in a public issue.
