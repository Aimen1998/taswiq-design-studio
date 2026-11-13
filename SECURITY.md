# Security policy · سياسة الأمان

**Report a vulnerability privately:** GitHub → this repository → **Security** → **Report a vulnerability**.
Please do not open a public issue. We answer within 7 days and credit reporters who wish it.

**أبلغ عن ثغرة سرّاً:** في GitHub ← هذا المستودع ← **Security** ← **Report a vulnerability**. لا تفتح بلاغاً عاماً.
نرد خلال 7 أيام، ونذكر اسم المُبلغ إن رغب.

Supported: the latest release on `main`. · المدعوم: آخر إصدار على `main`.

The standalone site keeps everything in the visitor's browser (no server, no account, no tracking). Its response
headers (CSP and others) are in `app/public/_headers`. · النسخة المستقلة تحفظ كل شيء في متصفح الزائر، وترويساتها في `app/public/_headers`.
