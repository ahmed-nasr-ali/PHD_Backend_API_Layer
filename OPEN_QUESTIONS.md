# Open Questions

الأسئلة اللي لسه مالهاش إجابة بس. أي سؤال يتجاوب عليه يتمسح من هنا.

| # | السؤال | ليه بنسأل | مين يجاوب | محتاجينه لـ |
| --- | --- | --- | --- | --- |
| D1 | اسم عمود البحث بتاع `com_LinkedUser` في `com_invitationrequests` هو `_com_linkeduser_value`؟ (جرّب `<DV_URL>api/data/v9.2/com_invitationrequests?$select=com_invitationrequestid,_com_linkeduser_value&$filter=_com_linkeduser_value ne null&$top=1`) | مستنتج مش مجرّب. لو غلط، `findById` هيرجع 502 لكل اليوزرز المدعوّين. التغيير في `LINKED_USER_COLUMN` بس | إنت (phdtest، الصبح) | مستندات التسجيل |
| V5 | مين يقدر يستقبل "request invitation": الـ owners بس، ولا الـ tenants كمان؟ | بيحدد مين يقدر يدعي مين | إنت (من الموبايل) | الدعوات |
| O2 | تشفير الباسورد: كل اليوزرز مرة واحدة، ولا كل واحد في أول login ليه؟ | التسجيل بيحفظ الباسورد زي ما هو دلوقتي | التيم ليد، وقت الـ login | الـ login |
| F4b | تاب Attachments في فورم اليوزر بيحمّل الملف من أنهي flow أو API؟ | إحنا بنكتب نفس الاسم والفولدر والمسار اللي بيقراه، فنتأكد إن مفيش حاجة تانية معتمدة على الـ flow | فريق الـ CRM | مش موقّف حاجة |
